use crate::{lease::Lease, percent, uuid, FIRMWARE};
use std::{
    env,
    fs::{self, File, OpenOptions},
    io::{self, Read, Write},
    os::{
        fd::AsRawFd,
        unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt},
    },
    path::{Path, PathBuf},
};

pub struct Error(pub i32, pub String);
pub type Result<T> = std::result::Result<T, Error>;
impl Error {
    pub fn failure(msg: &str) -> Self {
        Self(1, msg.into())
    }
    pub(super) fn conflict(msg: &str) -> Self {
        Self(3, msg.into())
    }
}
impl From<io::Error> for Error {
    fn from(e: io::Error) -> Self {
        Self(1, e.to_string())
    }
}

const BATTERY: &str="platform/soc/soc:qcom,pmic_glink/soc:qcom,pmic_glink:qcom,battery_charger/power_supply/battery";

#[cfg(target_os = "android")]
pub(super) fn platform() -> Result<(PathBuf, String)> {
    unsafe extern "C" {
        fn __system_property_find(name: *const libc::c_char) -> *const libc::c_void;
        fn __system_property_read_callback(
            property: *const libc::c_void,
            callback: unsafe extern "C" fn(
                *mut libc::c_void,
                *const libc::c_char,
                *const libc::c_char,
                u32,
            ),
            cookie: *mut libc::c_void,
        );
    }
    unsafe extern "C" fn fingerprint(
        cookie: *mut libc::c_void,
        _: *const libc::c_char,
        value: *const libc::c_char,
        _: u32,
    ) {
        if let Ok(value) = unsafe { std::ffi::CStr::from_ptr(value) }.to_str() {
            if valid_fingerprint(value) {
                *unsafe { &mut *cookie.cast::<Option<String>>() } = Some(value.into());
            }
        }
    }
    let property = unsafe { __system_property_find(c"ro.build.fingerprint".as_ptr()) };
    if property.is_null() {
        return Err(Error::failure("Cannot identify charging firmware"));
    }
    let mut value = None;
    unsafe {
        __system_property_read_callback(
            property,
            fingerprint,
            (&mut value as *mut Option<String>).cast(),
        );
    }
    Ok((
        PathBuf::from("/sys"),
        value.ok_or_else(|| Error::failure("Cannot identify charging firmware"))?,
    ))
}

#[cfg(not(target_os = "android"))]
pub(super) fn platform() -> Result<(PathBuf, String)> {
    let root = env::var_os("CHARGE_TEST_ROOT")
        .ok_or_else(|| Error::failure("Host requires fixture directory"))?;
    let root = fs::canonicalize(root)?;
    if root == Path::new("/") {
        return Err(Error::failure("Invalid fixture root"));
    }
    let fingerprint = read(&root.join("fingerprint"))?;
    let fingerprint = fingerprint.trim_end_matches('\n');
    if !valid_fingerprint(fingerprint) {
        return Err(Error::failure("Cannot identify charging firmware"));
    }
    Ok((root.join("sys"), fingerprint.into()))
}

fn valid_fingerprint(value: &str) -> bool {
    !value.is_empty() && value.len() <= 512 && !value.chars().any(char::is_control)
}

pub(super) fn regular(path: &Path, write: bool) -> Result<File> {
    let f = OpenOptions::new()
        .read(!write)
        .write(write)
        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
        .open(path)?;
    if !f.metadata()?.is_file() {
        return Err(Error::failure("Expected regular file"));
    }
    Ok(f)
}
pub(super) fn read(path: &Path) -> Result<String> {
    read_file(&regular(path, false)?)
}
pub(super) fn read_file(file: &File) -> Result<String> {
    let mut text = String::new();
    file.take(4097).read_to_string(&mut text)?;
    if text.len() > 4096 {
        return Err(Error::failure("Oversize charging state"));
    }
    Ok(text)
}
pub(super) fn exists(path: &Path) -> Result<bool> {
    match path.symlink_metadata() {
        Ok(_) => Ok(true),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.into()),
    }
}

pub(super) type Identity = (u64, u64);

pub(super) fn identity(meta: &fs::Metadata) -> Identity {
    (meta.dev(), meta.ino())
}

struct Receipt {
    confirmed: u8,
    pending: Option<u8>,
}

pub enum WindowUpdate {
    Applied,
    Rejected(Error),
}

impl WindowUpdate {
    pub fn require_applied(self) -> Result<()> {
        match self {
            Self::Applied => Ok(()),
            Self::Rejected(error) => Err(error),
        }
    }
}

pub struct Controller {
    state: PathBuf,
    battery_link: PathBuf,
    battery: PathBuf,
    battery_id: Identity,
    node: PathBuf,
    controller: PathBuf,
    controller_id: Identity,
    boot: String,
    session: String,
    launch: String,
}

impl Controller {
    pub fn discover(sys: &Path, state: &Path, firmware: &str, session: &str) -> Result<Self> {
        if firmware != FIRMWARE {
            return Err(Error::failure(
                "This device has no supported charging control backend",
            ));
        }
        let devices = sys.join("devices");
        let battery_link = sys.join("class/power_supply/battery");
        let battery = battery_link.canonicalize()?;
        if battery != devices.join(BATTERY)
            || read(&battery.join("type"))?.trim_end_matches('\n') != "Battery"
        {
            return Err(Error::failure("Unexpected battery controller"));
        }
        let node = sys.join("class/qcom-battery/input_suspend");
        let controller = node.canonicalize()?;
        if controller != node
            && !(controller.starts_with(&devices)
                && controller.file_name() == Some("input_suspend".as_ref()))
        {
            return Err(Error::failure("Unexpected input-suspend controller"));
        }
        let boot = fs::read_to_string("/proc/sys/kernel/random/boot_id")?
            .trim_end()
            .to_owned();
        if !uuid(&boot) {
            return Err(Error::failure("Invalid boot identity"));
        }
        Ok(Self {
            state: state.into(),
            battery_link,
            battery_id: identity(&battery.metadata()?),
            battery,
            node,
            controller_id: identity(&regular(&controller, false)?.metadata()?),
            controller,
            boot,
            session: session.into(),
            launch: String::new(),
        })
    }
    fn lock(&self) -> Result<File> {
        #[cfg(target_os = "android")]
        if unsafe { libc::geteuid() } != 0 {
            return Err(Error::failure("Root is required"));
        }
        let lock = OpenOptions::new()
            .append(true)
            .create(true)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW)
            .open(self.state.join("threshold-lock"))?;
        if unsafe { libc::flock(lock.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            return Err(Error::failure("Charge limit lock unavailable or busy"));
        }
        if exists(&self.state.join("threshold-state"))? {
            return Err(Error::failure("A threshold session must be restored first"));
        }
        if exists(&self.state.join("native-threshold-state"))? {
            return Err(Error::failure(
                "A standard threshold session must be restored first",
            ));
        }
        Ok(lock)
    }
    fn bound_node(&self, write: bool) -> Result<File> {
        if self.battery_link.canonicalize().ok().as_ref() != Some(&self.battery)
            || self.battery.metadata().ok().as_ref().map(identity) != Some(self.battery_id)
            || !read(&self.battery.join("type"))
                .is_ok_and(|value| value.trim_end_matches('\n') == "Battery")
            || self.node.canonicalize().ok().as_ref() != Some(&self.controller)
        {
            return Err(Error::conflict(
                "Battery or input-suspend binding changed; journal retained",
            ));
        }
        let file = regular(&self.controller, write)?;
        if identity(&file.metadata()?) != self.controller_id {
            return Err(Error::conflict(
                "Input-suspend attribute identity changed; journal retained",
            ));
        }
        Ok(file)
    }
    fn live(&self) -> Result<u8> {
        match read_file(&self.bound_node(false)?)?.trim_end_matches('\n') {
            "0" => Ok(0),
            "1" => Ok(1),
            _ => Err(Error::conflict("Invalid input suspend")),
        }
    }
    fn check(&self, r: &Receipt) -> Result<()> {
        match self.live() {
            Ok(value) if value == r.confirmed => Ok(()),
            Err(error @ Error(3, _)) => Err(error),
            _ => Err(Error::conflict(
                "Input suspend changed or outcome unknown; journal retained",
            )),
        }
    }
    fn journal(&self) -> PathBuf {
        self.state.join("input-suspend-state")
    }
    fn restored(&self) -> PathBuf {
        self.state.join("input-suspend-restored")
    }
    fn owner(&self) -> PathBuf {
        self.state.join("input-suspend-owner")
    }
    fn save(&self, r: &Receipt) -> Result<()> {
        let temp = self.state.join("input-suspend-state.new");
        // replace the staging name under the common lock, never follow a stale link.
        if exists(&temp)? {
            fs::remove_file(&temp)?;
        }
        let mut f = OpenOptions::new()
            .create_new(true)
            .write(true)
            .mode(0o600)
            .open(&temp)?;
        writeln!(
            f,
            "1\n{FIRMWARE}\n{}\n{}\n{}\n{}\n{}\n{}\n{}",
            self.boot,
            self.battery.display(),
            self.controller.display(),
            self.session,
            r.confirmed,
            r.pending
                .map(|n| n.to_string())
                .unwrap_or_else(|| "-".into()),
            self.launch
        )?;
        fs::rename(temp, self.journal())?;
        Ok(())
    }
    fn read_receipt(&self, path: &Path) -> Result<(Receipt, String)> {
        let text =
            read(path).map_err(|_| Error::conflict("Session journal missing or unreadable"))?;
        self.parse_receipt(&text)
    }
    fn parse_receipt(&self, text: &str) -> Result<(Receipt, String)> {
        let lines: Vec<_> = text.lines().collect();
        if lines.len() != 9
            || lines[..3] != ["1", FIRMWARE, &self.boot]
            || Path::new(lines[3]) != self.battery
            || Path::new(lines[4]) != self.controller
            || lines[5] != self.session
            || !uuid(lines[8])
        {
            return Err(Error::conflict("Charging journal identity changed"));
        }
        let (confirmed, pending) = match (lines[6], lines[7]) {
            ("0", "-") => (0, None),
            ("1", "-") => (1, None),
            ("0", "1") => (0, Some(1)),
            ("1", "0") => (1, Some(0)),
            _ => return Err(Error::conflict("Invalid charging write receipt")),
        };
        let receipt = Receipt { confirmed, pending };
        Ok((receipt, lines[8].to_owned()))
    }

    pub fn inspect(&self) -> Result<&'static str> {
        let owned = exists(&self.journal())?;
        let path = if owned {
            self.journal()
        } else {
            self.restored()
        };
        let evidence = regular(&path, false)?;
        let (receipt, launch) = self.parse_receipt(&read_file(&evidence)?)?;
        if receipt.pending.is_some() || (!owned && receipt.confirmed != 0) {
            return Ok("UNREADABLE");
        }
        let owner = self.verified_owner(&launch)?;
        let live = self.live()?;
        let status = if live != receipt.confirmed {
            "EXTERNALLY_CHANGED"
        } else if !owned {
            "RESTORED"
        } else if Self::owner_alive(&owner)? {
            "ACTIVE"
        } else {
            "UNREADABLE"
        };

        // Writers publish records by rename. Holding the original inode open
        // lets us detect even a round trip back to the same receipt contents.
        if identity(&evidence.metadata()?) != identity(&fs::symlink_metadata(path)?)
            || (!owned && exists(&self.journal())?)
            || exists(&self.state.join("threshold-state"))?
            || exists(&self.state.join("native-threshold-state"))?
        {
            return Ok("UNREADABLE");
        }
        Ok(status)
    }

    fn owner_marker(&self, launch: &str) -> String {
        let (battery_dev, battery_ino) = self.battery_id;
        let (node_dev, node_ino) = self.controller_id;
        format!("{launch}\n{battery_dev}:{battery_ino}\n{node_dev}:{node_ino}\n")
    }

    fn verified_owner(&self, launch: &str) -> Result<File> {
        let owner = regular(&self.owner(), false)?;
        if read_file(&owner)? != self.owner_marker(launch) {
            return Err(Error::conflict(
                "Charging launch or controller binding could not be verified; journal retained",
            ));
        }
        Ok(owner)
    }

    fn owner_alive(owner: &File) -> Result<bool> {
        if unsafe { libc::flock(owner.as_raw_fd(), libc::LOCK_SH | libc::LOCK_NB) } == 0 {
            return Ok(false);
        }
        let error = io::Error::last_os_error();
        if error.kind() == io::ErrorKind::WouldBlock {
            return Ok(true);
        }
        Err(error.into())
    }

    fn load(&self) -> Result<Receipt> {
        let (mut receipt, launch) = self.read_receipt(&self.journal())?;
        self.check(&receipt)?;
        if launch != self.launch {
            return Err(Error::conflict("Charging launch identity changed"));
        }
        if receipt.pending.take().is_some() {
            self.save(&receipt)?;
        }
        Ok(receipt)
    }
    fn writable(&self) -> Result<bool> {
        Ok(self.bound_node(false)?.metadata()?.permissions().mode() & 0o200 != 0)
    }
    pub fn start(&mut self) -> Result<File> {
        let _lock = self.lock()?;
        if exists(&self.journal())? {
            return Err(Error::failure(
                "Existing charging journal requires restoration",
            ));
        }
        if self.live()? != 0 || !self.writable()? {
            return Err(Error::failure("Input suspend already active or read-only"));
        }
        self.launch = fs::read_to_string("/proc/sys/kernel/random/uuid")?
            .trim_end()
            .to_owned();
        if !uuid(&self.launch) {
            return Err(Error::failure("Invalid launch identity"));
        }
        // Each launch gets its own lock inode. An inspector probing an old
        // marker cannot contend with startup of a new worker.
        let temp = self.state.join("input-suspend-owner.new");
        if exists(&temp)? {
            fs::remove_file(&temp)?;
        }
        let mut owner = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&temp)?;
        if unsafe { libc::flock(owner.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            return Err(Error::failure("Charging owner lock unavailable or busy"));
        }
        owner.write_all(self.owner_marker(&self.launch).as_bytes())?;
        fs::rename(temp, self.owner())?;
        self.save(&Receipt {
            confirmed: 0,
            pending: None,
        })?;
        Ok(owner)
    }
    fn change(&self, r: &mut Receipt, target: u8, lease: Option<&Lease>) -> Result<WindowUpdate> {
        self.check(r)?;
        if r.confirmed == target {
            return Ok(WindowUpdate::Applied);
        }
        r.pending = Some(target);
        self.save(r)?;
        self.check(r)?;
        if !self.writable()? {
            self.check(r)?;
            r.pending = None;
            self.save(r)?;
            return Ok(WindowUpdate::Rejected(Error::failure(
                "Input suspend became read-only",
            )));
        }
        let node = self.bound_node(true);
        #[cfg(not(target_os = "android"))]
        if lease.is_some() {
            fixture_pause("before-write");
        }
        self.check(r)?;
        if let Some(l) = lease {
            if !l.current()? {
                r.pending = None;
                self.save(r)?;
                return Err(Error(4, "Charging lease expired".into()));
            }
        }
        // A successful sysfs request must accept the entire value in one write.
        let bytes = if target == 0 { b"0\n" } else { b"1\n" };
        let written = match node {
            Ok(mut file) => file.write(bytes).is_ok_and(|count| count == bytes.len()),
            Err(error @ Error(3, _)) => return Err(error),
            Err(_) => false,
        };
        #[cfg(not(target_os = "android"))]
        if lease.is_some() {
            fixture_pause("after-write");
        }
        let live = self
            .live()
            .map_err(|_| Error::conflict("Cannot verify input suspend; journal retained"))?;
        if written && live == target {
            r.confirmed = target;
            r.pending = None;
            self.save(r)
                .map_err(|_| Error::conflict("Cannot confirm charging write; journal retained"))?;
            Ok(WindowUpdate::Applied)
        } else if live == r.confirmed {
            r.pending = None;
            self.save(r)?;
            Ok(WindowUpdate::Rejected(Error::failure(
                "Driver rejected input suspend",
            )))
        } else {
            Err(Error::conflict(
                "Unknown input-suspend outcome; journal retained",
            ))
        }
    }
    pub fn tick(&self, resume: u8, stop: u8, lease: &Lease) -> Result<WindowUpdate> {
        let _lock = self.lock()?;
        let mut r = self.load()?;
        let cap = match read(&self.battery.join("capacity"))
            .and_then(|value| percent(value.trim_end_matches('\n')))
        {
            Ok(cap) => cap,
            Err(error) => return Ok(WindowUpdate::Rejected(error)),
        };
        if cap >= stop {
            self.change(&mut r, 1, Some(lease))
        } else if cap <= resume {
            self.change(&mut r, 0, Some(lease))
        } else {
            Ok(WindowUpdate::Applied)
        }
    }
    pub fn restore(&mut self) -> Result<()> {
        let _lock = self.lock()?;
        let journal = self.journal();
        let restored = self.restored();
        if !exists(&journal)? {
            let (receipt, launch) = self.read_receipt(&restored)?;
            self.verified_owner(&launch)?;
            self.check(&receipt)?;
            if receipt.confirmed != 0 || receipt.pending.is_some() {
                return Err(Error::conflict("Invalid charging restoration receipt"));
            }
            return Ok(());
        }

        let (mut receipt, launch) = self.read_receipt(&journal)?;
        let owner = self.verified_owner(&launch)?;
        if Self::owner_alive(&owner)? {
            return Err(Error::failure("The input-suspend session is still active"));
        }
        self.check(&receipt)?;
        self.launch = launch;
        if receipt.pending.take().is_some() {
            self.save(&receipt)?;
        }
        self.restore_receipt(&mut receipt)
    }

    fn restore_receipt(&self, receipt: &mut Receipt) -> Result<()> {
        self.change(receipt, 0, None)?.require_applied()?;
        self.check(receipt)?;
        fs::rename(self.journal(), self.restored())?;
        Ok(())
    }

    pub fn cleanup(&self) -> Result<()> {
        let _lock = self.lock()?;
        self.restore_receipt(&mut self.load()?)
    }
}

#[cfg(not(target_os = "android"))]
fn fixture_pause(point: &str) {
    if env::var("CHARGE_TEST_PAUSE").as_deref() == Ok(point) {
        unsafe {
            libc::raise(libc::SIGSTOP);
        }
    }
}
