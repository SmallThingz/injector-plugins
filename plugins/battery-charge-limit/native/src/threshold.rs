//! Linux power_supply charge-window adapter. The driver enforces the two thresholds.
use crate::{
    lease::Lease,
    monitor::{exists, read, read_file, regular, Error, Result, WindowUpdate},
    percent, uuid,
};
use std::{
    collections::BTreeMap,
    fs::{self, File, OpenOptions},
    io::{self, Write},
    os::{
        fd::AsRawFd,
        unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt},
    },
    path::{Path, PathBuf},
};

const FILES: [&str; 2] = [
    "charge_control_start_threshold",
    "charge_control_end_threshold",
];
pub(super) const ACTIVE: &str = "native-threshold-state";
const RESTORED: &str = "native-threshold-restored";
const OWNER: &str = "native-threshold-owner";
const LOCK_BUSY: &str = "Charge limit lock is busy";

type Pair = [u8; 2];
type Identity = (u64, u64);

fn identity(meta: &fs::Metadata) -> Identity {
    (meta.dev(), meta.ino())
}

fn pair(text: &str) -> Result<Pair> {
    let (start, end) = text
        .split_once(' ')
        .ok_or_else(|| Error::conflict("Invalid threshold receipt"))?;
    checked_pair(percent(start)?, percent(end)?)
}

fn checked_pair(start: u8, end: u8) -> Result<Pair> {
    if start > end {
        return Err(Error::failure(
            "The battery start threshold exceeds its end threshold",
        ));
    }
    Ok([start, end])
}

#[derive(PartialEq, Eq)]
struct BatteryStatus {
    scope: Option<String>,
    reports_presence: bool,
}

impl BatteryStatus {
    fn eligible(device: &Path) -> Result<Option<Self>> {
        let scope = optional_attribute(device, "scope")?;
        match scope.as_deref() {
            Some("Device") => return Ok(None),
            Some("System" | "Unknown") | None => (),
            _ => return Err(Error::failure("Cannot determine battery scope")),
        }
        let reports_presence = match optional_attribute(device, "present")?.as_deref() {
            Some("1") => true,
            Some("0") => return Ok(None),
            None => false,
            _ => return Err(Error::failure("Cannot identify a present battery")),
        };
        Ok(Some(Self {
            scope,
            reports_presence,
        }))
    }
}

fn optional_attribute(device: &Path, name: &str) -> Result<Option<String>> {
    let path = device.join(name);
    if !exists(&path)? {
        return Ok(None);
    }
    Ok(Some(read(&path)?.trim_end().to_owned()))
}

struct Receipt {
    launch: String,
    baseline: Pair,
    confirmed: Pair,
    pending: Option<Pair>,
}

pub(super) fn has_evidence(state: &Path, session: &str) -> Result<bool> {
    if exists(&state.join(ACTIVE))? {
        return Ok(true);
    }
    if exists(&state.join("input-suspend-state"))? {
        return Ok(false);
    }
    let restored = state.join(RESTORED);
    // An older restored receipt from another backend is not this session's proof.
    Ok(exists(&restored)? && read(&restored)?.lines().nth(7) == Some(session))
}

pub(super) struct Controller {
    state: PathBuf,
    link: PathBuf,
    battery: PathBuf,
    battery_id: Identity,
    status: BatteryStatus,
    nodes: [Identity; 2],
    fingerprint: String,
    boot: String,
    session: String,
    launch: String,
}

impl Controller {
    pub(super) fn discover(
        sys: &Path,
        state: &Path,
        fingerprint: &str,
        session: &str,
    ) -> Result<Option<Self>> {
        let supplies = match fs::read_dir(sys.join("class/power_supply")) {
            Ok(entries) => entries,
            Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(None),
            Err(err) => return Err(err.into()),
        };
        let devices = sys.join("devices").canonicalize()?;
        if !devices.starts_with(sys) {
            return Err(Error::failure("Unexpected power-supply device directory"));
        }
        let mut batteries = BTreeMap::new();
        let mut unknown_supply = false;
        for link in supplies {
            let link = link?.path();
            let Ok(device) = link.canonicalize() else {
                continue;
            };
            if !device.starts_with(&devices) {
                continue;
            }
            match read(&device.join("type")) {
                Ok(value) if value.trim_end() == "Battery" => (),
                Ok(value) if !value.trim_end().is_empty() => continue,
                _ => {
                    unknown_supply = true;
                    continue;
                }
            }
            if let Some(status) = BatteryStatus::eligible(&device)? {
                batteries.entry(device).or_insert((link, status));
            }
        }
        if batteries.len() > 1 {
            return Err(Error::failure(
                "Multiple batteries are present; charge control requires a single battery",
            ));
        }
        let Some((battery, (link, status))) = batteries.pop_first() else {
            return Ok(None);
        };
        let nodes = FILES.map(|name| battery.join(name));
        if !exists(&nodes[0])? && !exists(&nodes[1])? {
            return Ok(None);
        }
        if unknown_supply {
            return Err(Error::failure("Cannot identify all power supplies"));
        }
        if !exists(&nodes[0])? || !exists(&nodes[1])? {
            return Err(Error::failure(
                "The battery does not expose both charge thresholds",
            ));
        }
        let boot = read(Path::new("/proc/sys/kernel/random/boot_id"))?
            .trim_end()
            .to_owned();
        if !uuid(&boot)
            || battery
                .to_str()
                .is_none_or(|p| p.chars().any(char::is_control))
        {
            return Err(Error::failure(
                "Cannot identify the charge threshold controller",
            ));
        }
        Ok(Some(Self {
            state: state.into(),
            link,
            status,
            battery_id: identity(&battery.metadata()?),
            nodes: [
                identity(&regular(&nodes[0], false)?.metadata()?),
                identity(&regular(&nodes[1], false)?.metadata()?),
            ],
            battery,
            fingerprint: fingerprint.into(),
            boot,
            session: session.into(),
            launch: String::new(),
        }))
    }

    fn lock(&self) -> Result<File> {
        self.try_lock()?.ok_or_else(|| Error::failure(LOCK_BUSY))
    }

    fn try_lock(&self) -> Result<Option<File>> {
        #[cfg(target_os = "android")]
        if unsafe { libc::geteuid() } != 0 {
            return Err(Error::failure("Root is required"));
        }
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(self.state.join("threshold-lock"))?;
        if !file.metadata()?.is_file() {
            return Err(Error::failure("Charge limit lock is unavailable"));
        }
        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            let err = io::Error::last_os_error();
            if err.kind() == io::ErrorKind::WouldBlock {
                return Ok(None);
            }
            return Err(err.into());
        }
        if exists(&self.state.join("threshold-state"))?
            || exists(&self.state.join("input-suspend-state"))?
        {
            return Err(Error::failure(
                "Another charging backend requires restoration",
            ));
        }
        Ok(Some(file))
    }

    fn node(&self, index: usize, write: bool) -> Result<File> {
        if self.link.canonicalize()? != self.battery
            || identity(&self.battery.metadata()?) != self.battery_id
        {
            return Err(Error::conflict("Battery identity changed"));
        }
        if !read(&self.battery.join("type")).is_ok_and(|value| value.trim_end() == "Battery")
            || BatteryStatus::eligible(&self.battery)
                .ok()
                .flatten()
                .as_ref()
                != Some(&self.status)
        {
            return Err(Error::conflict(
                "Battery scope or presence changed; charge threshold journal retained",
            ));
        }
        let file = regular(&self.battery.join(FILES[index]), write)?;
        if identity(&file.metadata()?) != self.nodes[index] {
            return Err(Error::conflict(
                "Charge threshold attribute identity changed",
            ));
        }
        Ok(file)
    }

    fn live(&self) -> Result<Pair> {
        checked_pair(
            percent(read_file(&self.node(0, false)?)?.trim_end_matches('\n'))?,
            percent(read_file(&self.node(1, false)?)?.trim_end_matches('\n'))?,
        )
    }

    fn require_write_access(&self) -> Result<()> {
        for index in 0..FILES.len() {
            if self.node(index, false)?.metadata()?.permissions().mode() & 0o222 == 0 {
                return Err(Error::failure("Charge thresholds are read-only"));
            }
            self.node(index, true)
                .map_err(|_| Error::failure("Charge thresholds are inaccessible"))?;
        }
        self.require_enforcement_mode()
    }

    fn require_enforcement_mode(&self) -> Result<()> {
        let Some(modes) = optional_attribute(&self.battery, "charge_types")? else {
            return Ok(());
        };
        let mut active = modes
            .split_ascii_whitespace()
            .filter_map(|mode| mode.strip_prefix('[')?.strip_suffix(']'));
        let selected = active.next();
        if active.next().is_some() {
            return Err(Error::failure("Cannot determine the active charging mode"));
        }
        if modes
            .split_ascii_whitespace()
            .any(|mode| matches!(mode, "Custom" | "[Custom]"))
        {
            let custom = match selected {
                Some(mode) => mode == "Custom",
                None => {
                    optional_attribute(&self.battery, "charge_type")?.as_deref() == Some("Custom")
                }
            };
            if !custom {
                return Err(Error::failure(
                    "Select the battery driver's Custom charging mode first",
                ));
            }
        }
        Ok(())
    }

    fn header(&self) -> String {
        let (dev, ino) = self.battery_id;
        let (start_dev, start_ino) = self.nodes[0];
        let (end_dev, end_ino) = self.nodes[1];
        format!(
            "2\n{}\n{}\n{}\n{dev}:{ino}\n{start_dev}:{start_ino}\n{end_dev}:{end_ino}\n{}\n{} {}",
            self.fingerprint,
            self.boot,
            self.battery.display(),
            self.session,
            self.status.scope.as_deref().unwrap_or("-"),
            u8::from(self.status.reports_presence)
        )
    }

    fn save(&self, receipt: &Receipt) -> Result<()> {
        let path = self.state.join("native-threshold-state.new");
        if exists(&path)? {
            fs::remove_file(&path)?;
        }
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&path)?;
        let [start, end] = receipt.baseline;
        let [low, high] = receipt.confirmed;
        let pending = receipt
            .pending
            .map_or_else(|| "-".into(), |[a, b]| format!("{a} {b}"));
        writeln!(
            file,
            "{}\n{}\n{start} {end}\n{low} {high}\n{pending}",
            self.header(),
            receipt.launch
        )?;
        fs::rename(path, self.state.join(ACTIVE))?;
        Ok(())
    }

    fn parse(&self, text: &str) -> Result<Receipt> {
        let header = self.header();
        let tail = text
            .strip_prefix(&header)
            .and_then(|tail| tail.strip_prefix('\n'))
            .ok_or_else(|| Error::conflict("Charge threshold journal identity changed"))?;
        let lines: Vec<_> = tail.lines().collect();
        let [launch, baseline, confirmed, pending] = lines.as_slice() else {
            return Err(Error::conflict("Invalid charge threshold journal"));
        };
        if !uuid(launch) {
            return Err(Error::conflict("Invalid charge threshold launch identity"));
        }
        let confirmed = pair(confirmed)?;
        let pending = if *pending == "-" {
            None
        } else {
            Some(pair(pending)?)
        };
        if pending.is_some_and(|values| (values[0] == confirmed[0]) == (values[1] == confirmed[1]))
        {
            return Err(Error::conflict("Invalid charge threshold write intent"));
        }
        Ok(Receipt {
            launch: (*launch).to_owned(),
            baseline: pair(baseline)?,
            confirmed,
            pending,
        })
    }

    fn owner_alive(&self, launch: &str) -> Result<bool> {
        let owner = regular(&self.state.join(OWNER), false)?;
        // The lock and the launch marker must be on the same inode.
        if read_file(&owner)? != launch {
            return Err(Error::conflict("Charge threshold owner identity changed"));
        }
        if unsafe { libc::flock(owner.as_raw_fd(), libc::LOCK_SH | libc::LOCK_NB) } == 0 {
            return Ok(false);
        }
        let err = io::Error::last_os_error();
        if err.kind() == io::ErrorKind::WouldBlock {
            return Ok(true);
        }
        Err(err.into())
    }

    pub(super) fn start(&mut self) -> Result<File> {
        let _lock = self.lock()?;
        if exists(&self.state.join(ACTIVE))? {
            return Err(Error::failure(
                "Existing charge thresholds require restoration",
            ));
        }
        self.require_write_access()?;
        let baseline = self.live()?;
        self.launch = read(Path::new("/proc/sys/kernel/random/uuid"))?
            .trim_end()
            .to_owned();
        if !uuid(&self.launch) {
            return Err(Error::failure("Invalid charge threshold launch identity"));
        }
        let temp = self.state.join("native-threshold-owner.new");
        if exists(&temp)? {
            fs::remove_file(&temp)?;
        }
        let mut owner = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&temp)?;
        if unsafe { libc::flock(owner.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            return Err(Error::failure("Charge threshold owner lock unavailable"));
        }
        owner.write_all(self.launch.as_bytes())?;
        fs::rename(temp, self.state.join(OWNER))?;
        self.save(&Receipt {
            launch: self.launch.clone(),
            baseline,
            confirmed: baseline,
            pending: None,
        })?;
        Ok(owner)
    }

    fn check(&self, receipt: &Receipt) -> Result<()> {
        match self.live() {
            Ok(live) if live == receipt.confirmed => Ok(()),
            Err(err @ Error(3, _)) => Err(err),
            _ => Err(Error::conflict(
                "Charge thresholds changed or outcome unknown; journal retained",
            )),
        }
    }

    fn set(
        &self,
        receipt: &mut Receipt,
        index: usize,
        target: u8,
        lease: Option<&Lease>,
    ) -> Result<bool> {
        self.check(receipt)?;
        if receipt.confirmed[index] == target {
            return Ok(true);
        }
        let mut pair = receipt.confirmed;
        pair[index] = target;
        checked_pair(pair[0], pair[1])?;
        let meta = self.node(index, false)?.metadata()?;
        if meta.permissions().mode() & 0o222 == 0 {
            return Ok(false);
        }
        let mut file = match self.node(index, true) {
            Ok(file) => file,
            Err(Error(3, message)) => return Err(Error(3, message)),
            Err(_) => {
                self.check(receipt)?;
                return Ok(false);
            }
        };
        receipt.pending = Some(pair);
        self.save(receipt)?;
        self.check(receipt)?;
        if let Some(lease) = lease {
            if !lease.current()? {
                receipt.pending = None;
                self.save(receipt)?;
                return Err(Error(4, "Charging lease expired".into()));
            }
        }
        #[cfg(not(target_os = "android"))]
        let text = format!("{}\n", fixture_value(index, target));
        #[cfg(target_os = "android")]
        let text = format!("{target}\n");
        let written = file
            .write(text.as_bytes())
            .is_ok_and(|count| count == text.len());
        #[cfg(not(target_os = "android"))]
        if written {
            file.set_len(text.len() as u64)?;
        }
        let live = self
            .live()
            .map_err(|_| Error::conflict("Cannot read back charge thresholds; journal retained"))?;
        let accepted = written && live == pair;
        if accepted || (written && index == 1 && live[0] == receipt.confirmed[0]) {
            // The ABI permits the end threshold to round. Track the actual window for
            // rollback, but never acknowledge different percentages as the saved input.
            receipt.confirmed = live;
            if !accepted {
                eprintln!(
                    "Driver applied stop threshold {}% after requesting {target}%.",
                    live[1]
                );
            }
        } else if live != receipt.confirmed {
            return Err(Error::conflict(
                "Charge threshold readback differs; journal retained",
            ));
        }
        receipt.pending = None;
        self.save(receipt).map_err(|_| {
            Error::conflict("Cannot confirm charge threshold write; journal retained")
        })?;
        Ok(accepted)
    }

    fn apply(&self, receipt: &mut Receipt, target: Pair, lease: Option<&Lease>) -> Result<bool> {
        let order = if target[0] >= receipt.confirmed[1] {
            [1, 0]
        } else {
            [0, 1]
        };
        for index in order {
            if !self.set(receipt, index, target[index], lease)? {
                return Ok(false);
            }
        }
        Ok(true)
    }

    pub(super) fn tick(&self, resume: u8, stop: u8, lease: &Lease) -> Result<WindowUpdate> {
        let Some(_lock) = self.try_lock()? else {
            return Ok(WindowUpdate::Rejected(Error::failure(LOCK_BUSY)));
        };
        self.require_enforcement_mode()?;
        let mut receipt = self.load_active()?;
        if receipt.launch != self.launch {
            return Err(Error::conflict("Charge threshold launch changed"));
        }
        let previous = receipt.confirmed;
        if self.apply(&mut receipt, checked_pair(resume, stop)?, Some(lease))? {
            return Ok(WindowUpdate::Applied);
        }
        if !self.apply(&mut receipt, previous, Some(lease))? {
            return Err(Error::conflict(
                "Could not restore the previous charge window; journal retained",
            ));
        }
        Ok(WindowUpdate::Rejected(Error::failure(
            "The driver rejected the charge threshold",
        )))
    }

    fn load_active(&self) -> Result<Receipt> {
        let mut receipt = self.parse(&read(&self.state.join(ACTIVE))?)?;
        self.check(&receipt)?;
        if receipt.pending.take().is_some() {
            self.save(&receipt)?;
        }
        Ok(receipt)
    }

    fn restore_active(&self, mut receipt: Receipt) -> Result<()> {
        let baseline = receipt.baseline;
        if !self.apply(&mut receipt, baseline, None)? {
            return Err(Error::conflict(
                "Could not restore charge thresholds; journal retained",
            ));
        }
        self.check(&receipt)?;
        fs::rename(self.state.join(ACTIVE), self.state.join(RESTORED))?;
        Ok(())
    }

    pub(super) fn restore(&self) -> Result<()> {
        let _lock = self.lock()?;
        if !exists(&self.state.join(ACTIVE))? {
            let receipt = self.parse(&read(&self.state.join(RESTORED))?)?;
            self.check(&receipt)?;
            if receipt.pending.is_none() && receipt.baseline == receipt.confirmed {
                return Ok(());
            }
            return Err(Error::conflict(
                "Invalid charge threshold restoration receipt",
            ));
        }
        let receipt = self.parse(&read(&self.state.join(ACTIVE))?)?;
        if self.owner_alive(&receipt.launch)? {
            return Err(Error::failure(
                "The charge threshold session is still active",
            ));
        }
        self.restore_active(self.load_active()?)
    }

    pub(super) fn cleanup(&self) -> Result<()> {
        let _lock = self.lock()?;
        let receipt = self.load_active()?;
        if receipt.launch != self.launch {
            return Err(Error::conflict("Charge threshold launch changed"));
        }
        self.restore_active(receipt)
    }

    pub(super) fn inspect(&self) -> Result<&'static str> {
        let active = exists(&self.state.join(ACTIVE))?;
        let path = self.state.join(if active { ACTIVE } else { RESTORED });
        let file = regular(&path, false)?;
        let receipt = self.parse(&read_file(&file)?)?;
        if receipt.pending.is_some() || (!active && receipt.confirmed != receipt.baseline) {
            return Ok("UNREADABLE");
        }
        let conclusion = if self.live()? != receipt.confirmed {
            "EXTERNALLY_CHANGED"
        } else if !active {
            "RESTORED"
        } else if self.require_enforcement_mode().is_err() {
            "EXTERNALLY_CHANGED"
        } else if self.owner_alive(&receipt.launch)? {
            "ACTIVE"
        } else {
            "UNREADABLE"
        };
        if identity(&file.metadata()?) != identity(&path.symlink_metadata()?)
            || (!active && exists(&self.state.join(ACTIVE))?)
            || exists(&self.state.join("input-suspend-state"))?
            || exists(&self.state.join("threshold-state"))?
        {
            return Ok("UNREADABLE");
        }
        Ok(conclusion)
    }
}

#[cfg(not(target_os = "android"))]
fn fixture_value(index: usize, target: u8) -> u8 {
    if index == 1 {
        if let Ok(rounding) = std::env::var("CHARGE_TEST_ROUND_END") {
            if let Some((requested, applied)) = rounding.split_once(':') {
                if percent(requested).ok() == Some(target) {
                    return percent(applied).unwrap_or(target);
                }
            }
        }
    }
    target
}
