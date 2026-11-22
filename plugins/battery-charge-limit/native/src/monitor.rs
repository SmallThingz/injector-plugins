use crate::{lease::Lease, percent, uuid, FIRMWARE};
use std::{
    env,
    fs::{self, File, OpenOptions},
    io::{self, Read, Write},
    os::{
        fd::AsRawFd,
        unix::fs::{OpenOptionsExt, PermissionsExt},
    },
    path::{Path, PathBuf},
};

pub struct Error(pub i32, pub String);
pub type Result<T> = std::result::Result<T, Error>;
impl Error {
    pub fn failure(msg: &str) -> Self {
        Self(1, msg.into())
    }
    fn conflict(msg: &str) -> Self {
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
fn platform() -> Result<PathBuf> {
    unsafe extern "C" {
        fn __system_property_get(name: *const libc::c_char, value: *mut libc::c_char) -> i32;
    }
    let mut buf = [0 as libc::c_char; 92];
    let n = unsafe { __system_property_get(c"ro.build.fingerprint".as_ptr(), buf.as_mut_ptr()) };
    if n <= 0 || unsafe { std::ffi::CStr::from_ptr(buf.as_ptr()) }.to_bytes() != FIRMWARE.as_bytes()
    {
        return Err(Error::failure("Unsupported charging firmware"));
    }
    Ok(PathBuf::from("/sys"))
}

#[cfg(not(target_os = "android"))]
fn platform() -> Result<PathBuf> {
    let root = env::var_os("CHARGE_TEST_ROOT")
        .ok_or_else(|| Error::failure("Host requires fixture directory"))?;
    let root = fs::canonicalize(root)?;
    if root == Path::new("/") {
        return Err(Error::failure("Invalid fixture root"));
    }
    if fs::read_to_string(root.join("fingerprint"))?.trim_end() != FIRMWARE {
        return Err(Error::failure("Unsupported charging firmware"));
    }
    Ok(root.join("sys"))
}

fn regular(path: &Path, write: bool) -> Result<File> {
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
fn read(path: &Path) -> Result<String> {
    let mut text = String::new();
    regular(path, false)?.take(4097).read_to_string(&mut text)?;
    if text.len() > 4096 {
        return Err(Error::failure("Oversize charging state"));
    }
    Ok(text)
}
fn exists(path: &Path) -> Result<bool> {
    match path.symlink_metadata() {
        Ok(_) => Ok(true),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.into()),
    }
}
struct Receipt {
    confirmed: u8,
    pending: Option<u8>,
}
pub struct Controller {
    state: PathBuf,
    battery_link: PathBuf,
    battery: PathBuf,
    node: PathBuf,
    controller: PathBuf,
    boot: String,
    session: String,
    launch: String,
}

impl Controller {
    pub fn discover(session: &str) -> Result<Self> {
        let sys = platform()?;
        let state = PathBuf::from(
            env::var_os("PLUGIN_STATE_DIR")
                .ok_or_else(|| Error::failure("Missing state directory"))?,
        );
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
        let launch = fs::read_to_string("/proc/sys/kernel/random/uuid")?
            .trim_end()
            .to_owned();
        if !uuid(&boot) || !uuid(&launch) {
            return Err(Error::failure("Invalid boot or launch identity"));
        }
        Ok(Self {
            state,
            battery_link,
            battery,
            node,
            controller,
            boot,
            session: session.into(),
            launch,
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
        Ok(lock)
    }
    fn live(&self) -> Result<u8> {
        if self.node.canonicalize()? != self.controller {
            return Err(Error::conflict("Input-suspend controller changed"));
        }
        match read(&self.node)?.trim_end_matches('\n') {
            "0" => Ok(0),
            "1" => Ok(1),
            _ => Err(Error::conflict("Invalid input suspend")),
        }
    }
    fn check(&self, r: &Receipt) -> Result<()> {
        if self.live().ok() != Some(r.confirmed) {
            return Err(Error::conflict(
                "Input suspend changed or outcome unknown; journal retained",
            ));
        }
        Ok(())
    }
    fn journal(&self) -> PathBuf {
        self.state.join("input-suspend-state")
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
    fn load(&self) -> Result<Receipt> {
        let text = read(&self.journal())
            .map_err(|_| Error::conflict("Session journal missing or unreadable"))?;
        let lines: Vec<_> = text.lines().collect();
        if lines.len() != 9
            || lines[..3] != ["1", FIRMWARE, &self.boot]
            || Path::new(lines[3]) != self.battery
            || Path::new(lines[4]) != self.controller
            || lines[5] != self.session
            || lines[8] != self.launch
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
        let mut r = Receipt { confirmed, pending };
        self.check(&r)?;
        if r.pending.take().is_some() {
            self.save(&r)?;
        }
        Ok(r)
    }
    fn writable(&self) -> Result<bool> {
        Ok(self.node.symlink_metadata()?.permissions().mode() & 0o200 != 0)
    }
    pub fn start(&self) -> Result<()> {
        let _lock = self.lock()?;
        if exists(&self.journal())? {
            return Err(Error::failure(
                "Existing charging journal requires restoration",
            ));
        }
        if self.live()? != 0 || !self.writable()? {
            return Err(Error::failure("Input suspend already active or read-only"));
        }
        self.save(&Receipt {
            confirmed: 0,
            pending: None,
        })
    }
    fn change(&self, r: &mut Receipt, target: u8, lease: Option<&Lease>) -> Result<()> {
        self.check(r)?;
        if r.confirmed == target {
            return Ok(());
        }
        r.pending = Some(target);
        self.save(r)?;
        self.check(r)?;
        if !self.writable()? {
            r.pending = None;
            self.save(r)?;
            return Err(Error::failure("Input suspend became read-only"));
        }
        let node = regular(&self.node, true);
        #[cfg(not(target_os = "android"))]
        if lease.is_some() {
            fixture_pause("before-write");
        }
        if let Some(l) = lease {
            if !l.current()? {
                r.pending = None;
                self.save(r)?;
                return Err(Error(4, "Charging lease expired".into()));
            }
        }
        // A successful sysfs request must accept the entire value in one write.
        let bytes = if target == 0 { b"0\n" } else { b"1\n" };
        let written = node
            .and_then(|mut f| Ok(f.write(bytes)? == bytes.len()))
            .unwrap_or(false);
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
        } else if live == r.confirmed {
            r.pending = None;
            self.save(r)?;
            Err(Error::failure("Driver rejected input suspend"))
        } else {
            Err(Error::conflict(
                "Unknown input-suspend outcome; journal retained",
            ))
        }
    }
    pub fn tick(&self, resume: u8, stop: u8, lease: &Lease) -> Result<()> {
        let _lock = self.lock()?;
        let mut r = self.load()?;
        if self.battery_link.canonicalize().ok().as_ref() != Some(&self.battery) {
            return Err(Error::conflict("Battery controller changed"));
        }
        let cap = percent(read(&self.battery.join("capacity"))?.trim_end_matches('\n'))?;
        if cap >= stop {
            self.change(&mut r, 1, Some(lease))?;
        } else if cap <= resume {
            self.change(&mut r, 0, Some(lease))?;
        }
        Ok(())
    }
    pub fn cleanup(&self) -> Result<()> {
        let _lock = self.lock()?;
        let mut r = self.load()?;
        self.change(&mut r, 0, None)?;
        self.check(&r)?;
        fs::rename(self.journal(), self.state.join("input-suspend-restored"))?;
        Ok(())
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
