use super::{
    freq, journal,
    policy::{policies, valid_id, Policy, PolicyKey},
    read, read_raw, token, writable, Journal, GOV, MAX, MAX_INPUT_BYTES,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    env,
    error::Error,
    fmt,
    fs::{self, File, OpenOptions},
    io::{self, Write},
    os::unix::fs::MetadataExt,
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
};

type Result<T> = std::result::Result<T, Box<dyn Error>>;

#[derive(Debug)]
pub(super) struct IncompleteRecovery(Box<dyn Error>);

impl fmt::Display for IncompleteRecovery {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "CPU control recovery is incomplete: {}", self.0)
    }
}

impl Error for IncompleteRecovery {}

static INTERRUPTED: AtomicBool = AtomicBool::new(false);
extern "C" fn interrupt(_: i32) {
    INTERRUPTED.store(true, Ordering::Relaxed);
}
extern "C" {
    fn signal(number: i32, handler: extern "C" fn(i32)) -> usize;
    fn umask(mask: u32) -> u32;
}

#[derive(Default)]
struct Plan {
    writes: Vec<Row>,
    verify: Vec<(PolicyKey, String, String)>,
    next: String,
}
struct Row {
    policy: PolicyKey,
    node: String,
    before: String,
    target: String,
    listed: bool,
}

fn number(dir: &Path, node: &str) -> Result<u32> {
    freq(&read(&dir.join(node))?).ok_or_else(|| format!("Invalid {node}.").into())
}
fn valid(dir: &Path, node: &str, value: &str) -> Result<()> {
    let ok = match node {
        GOV => {
            token(value)
                && read(&dir.join("scaling_available_governors"))?
                    .split_ascii_whitespace()
                    .any(|s| s == value)
        }
        MAX => (number(dir, "scaling_min_freq")?..=number(dir, "cpuinfo_max_freq")?)
            .contains(&freq(value).ok_or("Invalid frequency.")?),
        _ => false,
    };
    if !ok {
        return Err(format!(
            "{} does not currently support {value}.",
            dir.join(node).display()
        )
        .into());
    }
    Ok(())
}
fn step(dir: &Path, low: u32, high: u32) -> Result<u32> {
    let table = read(&dir.join("scaling_available_frequencies"))?;
    let mut best = None;
    for word in table.split_ascii_whitespace() {
        let n = freq(word).ok_or("Invalid frequency table.")?;
        if (low..=high).contains(&n) {
            best = Some(best.unwrap_or(0).max(n))
        }
    }
    best.ok_or_else(|| "No listed frequency fits the requested ceiling.".into())
}
fn supported(root: &Path, policies: &BTreeMap<String, Policy>) -> bool {
    policies.iter().any(|(p, policy)| {
        let dir = root.join(p);
        !policy.online.is_empty()
            && [GOV, MAX].iter().any(|&n| {
                writable(&dir.join(n))
                    && read(&dir.join(n)).is_ok_and(|v| {
                        valid(&dir, n, &v).is_ok()
                            && (n == GOV
                                || number(&dir, "scaling_min_freq").is_ok_and(|low| {
                                    step(&dir, low, freq(&v).unwrap_or(0)).is_ok()
                                }))
                    })
            })
    })
}
enum Choice {
    System,
    Governor(String),
    Khz(u32),
    Percent(u32),
}
fn input(p: &str, key: &str, default: &str) -> Result<String> {
    match env::var(format!("INJECTOR_INPUT_{p}_{key}")) {
        Ok(value) => Ok(value),
        Err(env::VarError::NotPresent) => Ok(default.into()),
        Err(e) => Err(e.into()),
    }
}
fn choices(p: &str, disable: bool) -> Result<[Choice; 2]> {
    if disable {
        return Ok([Choice::System, Choice::System]);
    }
    let governor = input(p, "governor", "system")?;
    if !token(&governor) {
        return Err("Invalid governor.".into());
    }
    let cap = input(p, "max_khz", "legacy")?;
    let max = match cap.as_str() {
        "system" => Choice::System,
        "legacy" => match freq(&input(p, "percent", "100")?)
            .filter(|p| *p <= 100)
            .ok_or("Frequency ceiling must be 1 to 100 percent.")?
        {
            100 => Choice::System,
            n => Choice::Percent(n),
        },
        _ => Choice::Khz(freq(&cap).ok_or("Ceiling must be a whole number in kHz.")?),
    };
    Ok([
        max,
        if governor == "system" {
            Choice::System
        } else {
            Choice::Governor(governor)
        },
    ])
}
fn requested_policies() -> impl Iterator<Item = String> {
    env::vars_os().filter_map(|(key, _)| {
        let input = key.to_str()?.strip_prefix("INJECTOR_INPUT_")?;
        ["_governor", "_max_khz", "_percent"]
            .iter()
            .find_map(|suffix| input.strip_suffix(suffix).filter(|id| valid_id(id)))
            .map(str::to_owned)
    })
}

fn plan_field(
    plan: &mut Plan,
    root: &Path,
    saved: &Journal,
    p: &str,
    policy: Option<&Policy>,
    n: &str,
    choice: Choice,
) -> Result<()> {
    let entry = saved.get(&(p.into(), n.into()));
    if entry.is_none() && matches!(choice, Choice::System) {
        return Ok(());
    }
    let policy = policy
        .filter(|policy| !policy.online.is_empty())
        .ok_or_else(|| format!("{p} is unavailable or offline."))?;
    if entry.is_some_and(|entry| !entry.policy.matches(policy)) {
        return Err(format!("{p} CPU policy identity changed.").into());
    }
    let key = PolicyKey::current(p, policy);
    let dir = root.join(p);
    let path = dir.join(n);
    let live = read(&path)?;
    if (n == MAX && freq(&live).is_none()) || (n == GOV && !token(&live)) {
        return Err(format!("Invalid {p}/{n}.").into());
    }
    let mut original = &live;
    if let Some(entry) = entry {
        if live != entry.applied {
            if matches!(choice, Choice::System) {
                println!("Preserved external {p}/{n} ({live}).");
                return Ok(());
            }
            return Err(format!(
                "{p}/{n} changed to {live} externally. Disable to release its saved setting."
            )
            .into());
        }
        original = &entry.baseline;
    }
    let explicit = !matches!(choice, Choice::System);
    let listed = matches!(choice, Choice::Khz(_) | Choice::Percent(_));
    let wanted = match choice {
        Choice::System => original.clone(),
        Choice::Governor(v) => v,
        Choice::Percent(_) | Choice::Khz(_) => {
            let baseline = freq(original).ok_or("Invalid original frequency.")?;
            let low = number(&dir, "scaling_min_freq")?;
            let high = baseline.min(number(&dir, "cpuinfo_max_freq")?);
            match choice{
                Choice::Khz(n)=>{
                    if !(low..=high).contains(&n){return Err(format!("{p} ceiling {n} kHz does not fit the live minimum of {low} kHz and ceiling of {high} kHz.").into())}
                    step(&dir,n,n)?
                },
                Choice::Percent(n)=>step(&dir,low, high.min((u64::from(baseline)*u64::from(n)/100) as u32))?,
                _=>unreachable!()
            }.to_string()
        }
    };
    valid(&dir, n, &wanted)?;
    if (live != wanted || explicit) && !writable(&path) {
        return Err(format!("{p}/{n} is read-only or inaccessible.").into());
    }
    if live != wanted {
        valid(&dir, n, &live)?;
        plan.writes.push(Row {
            policy: key.clone(),
            node: n.into(),
            before: live.clone(),
            target: wanted.clone(),
            listed,
        });
    }
    if &wanted != original {
        plan.next
            .push_str(&format!("{key} {n} {original} {wanted}\n"))
    }
    if n == MAX {
        println!("{p} maximum frequency requested: {wanted} kHz");
    } else {
        println!("{p} governor requested: {wanted}");
    }
    plan.verify.push((key, n.into(), wanted));
    Ok(())
}

fn change(root: &Path, row: &Row, restore: bool, attempt: Option<&Path>) -> Result<()> {
    let dir = root.join(row.policy.id());
    let path = dir.join(&row.node);
    let (expected, target) = if restore {
        (&row.target, &row.before)
    } else {
        (&row.before, &row.target)
    };
    if !row.policy.online(root) || read(&path)? != *expected || !writable(&path) {
        return Err(format!("{} changed before write.", path.display()).into());
    }
    if !restore && row.listed {
        let n = freq(target).ok_or("Invalid frequency.")?;
        step(&dir, n, n)?;
    }
    valid(&dir, &row.node, target)?;
    // Open without truncating or creating; recheck identity before using this descriptor.
    let mut file = OpenOptions::new().write(true).open(&path)?;
    let opened = file.metadata()?;
    let current = fs::symlink_metadata(&path)?;
    if !current.is_file()
        || (opened.dev(), opened.ino()) != (current.dev(), current.ino())
        || !row.policy.online(root)
    {
        return Err(format!("{} is offline or changed before write.", path.display()).into());
    }
    if let Some(marker) = attempt {
        File::create_new(marker)?;
    }
    let value = format!("{target}\n");
    file.write_all(value.as_bytes())?;
    if !row.policy.online(root) || read(&path)? != *target {
        return Err(format!("Readback failed for {}.", path.display()).into());
    }
    valid(&dir, &row.node, target)
}

fn kind(path: &Path) -> Result<Option<fs::FileType>> {
    match fs::symlink_metadata(path) {
        Ok(m) => Ok(Some(m.file_type())),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}
fn regular(path: &Path) -> Result<bool> {
    match kind(path)? {
        None => Ok(false),
        Some(t) if t.is_file() => Ok(true),
        _ => Err(format!("Invalid journal file {}.", path.display()).into()),
    }
}

pub(super) fn inspect(root: &Path, state: &Path) -> Result<()> {
    if !matches!(kind(state)?, Some(entry) if entry.is_dir()) {
        return Err("Missing current-boot CPU frequency state directory.".into());
    }
    let lock_path = state.join("lock");
    if !regular(&lock_path)? {
        return Err("Missing CPU frequency lock.".into());
    }
    let lock = File::open(&lock_path)?;
    lock.try_lock()
        .map_err(|_| "Another CPU frequency operation is in progress.")?;
    let opened = lock.metadata()?;
    let current = fs::symlink_metadata(&lock_path)?;
    if !current.is_file() || (opened.dev(), opened.ino()) != (current.dev(), current.ino()) {
        return Err("CPU frequency lock changed during inspection.".into());
    }

    // Any pending entry leaves the transaction unconfirmed, even after active was published.
    let saved = journal(state)?.ok_or("Missing CPU frequency restore journal.")?;
    for ((id, node), entry) in saved {
        let path = root.join(&id).join(&node);
        if !entry.policy.has_full_identity()
            || !entry.policy.online(root)
            || !fs::symlink_metadata(&path)?.is_file()
            || read(&path)? != entry.applied
            || !entry.policy.online(root)
        {
            return Err(format!("Cannot verify the recorded value for {id}/{node}.").into());
        }
    }
    Ok(())
}

fn directory(path: &Path) -> Result<()> {
    match kind(path)? {
        None => Ok(fs::create_dir(path)?),
        Some(t) if t.is_dir() => Ok(()),
        _ => Err(format!("Invalid journal directory {}.", path.display()).into()),
    }
}
fn parse_reverse(path: &Path) -> Result<Vec<(usize, Row)>> {
    if !regular(path)? {
        return Err("Missing rollback journal.".into());
    }
    let text = read_raw(path)?;
    let mut rows = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let count = text.lines().count();
    for (offset, line) in text.lines().enumerate() {
        let fields: Vec<_> = line.split_ascii_whitespace().collect();
        let [idx, p, n, b, t, list] = fields.as_slice() else {
            return Err("Invalid rollback row.".into());
        };
        let index = count - offset;
        let policy = PolicyKey::parse(p).ok_or("Invalid rollback policy.")?;
        if idx != &index.to_string()
            || !seen.insert((policy.id().to_string(), *n))
            || !match *n {
                MAX => freq(b).is_some() && freq(t).is_some() && matches!(*list, "listed" | "-"),
                GOV => token(b) && token(t) && *list == "-",
                _ => false,
            }
        {
            return Err("Invalid rollback row.".into());
        }
        rows.push((
            index,
            Row {
                policy,
                node: n.to_string(),
                before: b.to_string(),
                target: t.to_string(),
                listed: *list == "listed",
            },
        ));
    }
    Ok(rows)
}
fn recover(root: &Path, state: &Path) -> Result<()> {
    let pending = state.join("pending");
    match kind(&pending)? {
        None => return Ok(()),
        Some(t) if t.is_dir() => (),
        _ => return Err("Invalid pending journal.".into()),
    }
    if regular(&pending.join("next"))? {
        let rows = parse_reverse(&pending.join("reverse"))?;
        // An attempt outside the plan has an unknown outcome. Keep its receipt.
        for entry in fs::read_dir(&pending)? {
            let name = entry?.file_name();
            if let Some(n) = name.to_string_lossy().strip_prefix("attempt.") {
                if !rows.iter().any(|(i, _)| i.to_string() == n) {
                    return Err("Unrecognized attempt marker.".into());
                }
            }
        }
        let mut failure = None;
        for (idx, row) in rows {
            let marker = pending.join(format!("attempt.{idx}"));
            if !regular(&marker)? {
                continue;
            }
            let result = (|| -> Result<()> {
                if !row.policy.online(root) {
                    return Err(format!(
                        "Cannot restore {}/{} while the CPU policy is offline or its identity has changed.",
                        row.policy.id(), row.node
                    )
                    .into());
                }
                let live = read(&root.join(row.policy.id()).join(&row.node))?;
                if live == row.target {
                    change(root, &row, true, None)?
                } else if live != row.before {
                    return Err(format!(
                        "Cannot verify rollback of {}/{}: read {live}, expected {} or {}.",
                        row.policy.id(),
                        row.node,
                        row.before,
                        row.target
                    )
                    .into());
                }
                Ok(fs::remove_file(&marker)?)
            })();
            if let Err(e) = result {
                failure = Some(e)
            }
        }
        if let Some(e) = failure {
            return Err(e);
        }
    }
    let retired = state.join("stage/retired");
    fs::rename(pending, &retired)?;
    Ok(fs::remove_dir_all(retired)?)
}
fn check_signal() -> Result<()> {
    if INTERRUPTED.load(Ordering::Relaxed) {
        return Err("CPU operation interrupted.".into());
    }
    Ok(())
}
pub(super) fn apply(root: &Path, state: &Path, event: &str) -> Result<String> {
    // The process is single threaded and owns this umask for its lifetime.
    unsafe {
        umask(0o077);
    }
    fs::create_dir_all(state.parent().ok_or("Missing state parent.")?)?;
    directory(state)?;
    let lock_path = state.join("lock");
    regular(&lock_path)?;
    let lock = OpenOptions::new()
        .append(true)
        .create(true)
        .open(lock_path)?;
    lock.try_lock()
        .map_err(|_| "Another CPU frequency operation is in progress.")?;
    let stage = state.join("stage");
    directory(&stage)?;
    let retired = stage.join("retired");
    if kind(&retired)?.is_some() {
        fs::remove_dir_all(retired)?
    }
    recover(root, state).map_err(IncompleteRecovery)?;
    fs::remove_dir_all(&stage)?;
    let new = stage.join("new");
    fs::create_dir_all(&new)?;
    let active = state.join("active");
    if !regular(&active)? {
        File::create_new(&active)?;
    }
    let saved = journal(state)?.unwrap_or_default();
    let policies = policies(root)?;
    let mut ids: BTreeSet<_> = policies.keys().cloned().collect();
    ids.extend(saved.keys().map(|(id, _)| id.clone()));
    if event != "disable" {
        ids.extend(requested_policies());
    }
    let mut plan = Plan::default();
    for p in ids {
        for (n, choice) in [MAX, GOV].into_iter().zip(choices(&p, event == "disable")?) {
            plan_field(&mut plan, root, &saved, &p, policies.get(&p), n, choice)?;
        }
    }
    if event != "disable" && saved.is_empty() && plan.verify.is_empty() {
        if !supported(root, &policies) {
            return Err("No usable CPU frequency controls were found.".into());
        }
        return Ok("CPU policies are using system settings.".into());
    }
    let lines: Vec<_> = plan
        .writes
        .iter()
        .map(|r| {
            format!(
                "{} {} {} {} {}\n",
                r.policy,
                r.node,
                r.before,
                r.target,
                if r.listed { "listed" } else { "-" }
            )
        })
        .collect();
    let reverse: String = lines
        .iter()
        .enumerate()
        .rev()
        .map(|(i, line)| format!("{} {line}", i + 1))
        .collect();
    if [plan.next.len(), reverse.len()]
        .into_iter()
        .any(|size| size > MAX_INPUT_BYTES)
    {
        return Err("CPU restore journal would exceed its supported size.".into());
    }
    fs::write(new.join("next"), &plan.next)?;
    fs::write(new.join("plan"), lines.concat())?;
    fs::write(new.join("reverse"), reverse)?;
    let verify: String = plan
        .verify
        .iter()
        .map(|(p, n, t)| format!("{p} {n} {t}\n"))
        .collect();
    fs::write(new.join("verify"), verify)?;
    for sig in [1, 2, 15] {
        if unsafe { signal(sig, interrupt) } == usize::MAX {
            return Err("Cannot install CPU interruption handler.".into());
        }
    }
    let pending = state.join("pending");
    fs::rename(&new, &pending)?;
    let applied = (|| -> Result<()> {
        for (i, row) in plan.writes.iter().enumerate() {
            check_signal()?;
            change(
                root,
                row,
                false,
                Some(&pending.join(format!("attempt.{}", i + 1))),
            )?;
        }
        for (p, n, wanted) in &plan.verify {
            if !p.online(root) || read(&root.join(p.id()).join(n))? != *wanted {
                return Err(format!("{}/{n} changed during apply.", p.id()).into());
            }
        }
        check_signal()?;
        Ok(fs::rename(pending.join("next"), active)?)
    })();
    recover(root, state).map_err(IncompleteRecovery)?;
    applied?;
    Ok("CPU frequency settings confirmed.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    struct Fixture(PathBuf);

    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0).unwrap();
        }
    }

    fn rollback_fixture(live: &str) -> (Fixture, PathBuf, PathBuf) {
        let fixture = Fixture(
            env::temp_dir().join(format!("cpu-recovery-{}-{live}", std::process::id())),
        );
        let root = fixture.0.join("sysfs");
        let dir = root.join("policy0");
        let state = fixture.0.join("state");
        let pending = state.join("pending");
        fs::create_dir_all(&dir).unwrap();
        fs::create_dir_all(&pending).unwrap();
        for (name, value) in [
            ("related_cpus", "0 1 2 3"),
            ("affected_cpus", "0 1 2 3"),
            ("scaling_driver", "fixture"),
            ("scaling_min_freq", "500000"),
            ("cpuinfo_max_freq", "2000000"),
            (MAX, live),
        ] {
            fs::write(dir.join(name), format!("{value}\n")).unwrap();
        }
        let policy = Policy::read(&root, "policy0").unwrap();
        let key = PolicyKey::current("policy0", &policy);
        fs::write(
            pending.join("reverse"),
            format!("1 {key} {MAX} 1804800 1708800 listed\n"),
        )
        .unwrap();
        fs::write(pending.join("next"), format!("{key} {MAX} 1804800 1708800\n")).unwrap();
        File::create_new(pending.join("attempt.1")).unwrap();
        (fixture, root, state)
    }

    #[test]
    fn ambiguous_readback_retains_the_attempt_and_live_value() {
        let (_fixture, root, state) = rollback_fixture("1600000");
        let pending = state.join("pending");
        let reverse = fs::read(pending.join("reverse")).unwrap();
        let next = fs::read(pending.join("next")).unwrap();
        for _ in 0..2 {
            let error = apply(&root, &state, "disable").unwrap_err();
            assert!(error.is::<IncompleteRecovery>());
            assert!(inspect(&root, &state).is_err());
            assert_eq!(read(&root.join("policy0").join(MAX)).unwrap(), "1600000");
            assert!(pending.join("attempt.1").is_file());
            assert_eq!(fs::read(pending.join("reverse")).unwrap(), reverse);
            assert_eq!(fs::read(pending.join("next")).unwrap(), next);
        }
    }

    #[test]
    fn known_readback_allows_rollback_to_finish() {
        for live in ["1708800", "1804800"] {
            let (_fixture, root, state) = rollback_fixture(live);
            apply(&root, &state, "disable").unwrap();
            assert_eq!(read(&root.join("policy0").join(MAX)).unwrap(), "1804800");
            assert!(!state.join("pending").exists());
        }
    }
}
