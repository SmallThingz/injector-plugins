mod policy;
mod transaction;
use policy::{policies, PolicyKey};
use std::{
    collections::BTreeMap,
    env,
    ffi::CString,
    fs,
    io::{self, Read},
    os::unix::{ffi::OsStrExt, fs::PermissionsExt},
    path::Path,
    process::ExitCode,
};

extern "C" {
    fn getuid() -> u32;
    fn access(path: *const std::ffi::c_char, mode: i32) -> i32;
}

const GOV: &str = "scaling_governor";
const MAX: &str = "scaling_max_freq";
const MAX_INPUT_BYTES: usize = 65536;
type Journal = BTreeMap<(String, String), Saved>;

struct Saved {
    policy: PolicyKey,
    baseline: String,
    applied: String,
}

fn read_raw(path: &Path) -> io::Result<String> {
    let mut text = String::new();
    fs::File::open(path)?
        .take((MAX_INPUT_BYTES + 1) as u64)
        .read_to_string(&mut text)?;
    if text.len() > MAX_INPUT_BYTES {
        return Err(io::Error::other("CPU probe input too large"));
    }
    Ok(text)
}

fn read(path: &Path) -> io::Result<String> {
    let text = read_raw(path)?;
    Ok(text.trim_end_matches('\n').to_owned())
}

fn token(s: &str) -> bool {
    !s.is_empty()
        && s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
}
fn digits(s: &str) -> bool {
    !s.is_empty() && !s.starts_with('0') && s.bytes().all(|c| c.is_ascii_digit())
}
fn freq(s: &str) -> Option<u32> {
    (s.len() <= 9 && digits(s))
        .then(|| s.parse().ok())
        .flatten()
}

fn writable(p: &Path) -> bool {
    let Ok(m) = fs::symlink_metadata(p) else {
        return false;
    };
    let Ok(c) = CString::new(p.as_os_str().as_bytes()) else {
        return false;
    };
    // access(W_OK) also checks the mount and caller's access rights.
    m.is_file() && m.permissions().mode() & 0o200 != 0 && unsafe { access(c.as_ptr(), 2) == 0 }
}

fn journal(state: &Path) -> Result<Option<Journal>, String> {
    let invalid = "Invalid CPU frequency restore journal.";
    match fs::symlink_metadata(state.join("pending")) {
        Ok(_) => return Err("CPU frequency recovery is pending.".into()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => (),
        Err(e) => return Err(e.to_string()),
    }
    let path = state.join("active");
    let mut entries = Journal::new();
    match fs::symlink_metadata(&path) {
        Ok(m) if m.is_file() => (),
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        _ => return Err(invalid.into()),
    }
    for line in read_raw(&path).map_err(|_| invalid)?.lines() {
        let fields: Vec<_> = line.split_ascii_whitespace().collect();
        let [p, n, a, b] = fields.as_slice() else {
            return Err(invalid.into());
        };
        let policy = PolicyKey::parse(p).ok_or(invalid)?;
        if !match *n {
            GOV => token(a) && token(b),
            MAX => freq(a).is_some() && freq(b).is_some(),
            _ => false,
        } || entries
            .insert(
                (policy.id().to_string(), n.to_string()),
                Saved {
                    policy,
                    baseline: a.to_string(),
                    applied: b.to_string(),
                },
            )
            .is_some()
        {
            return Err(invalid.into());
        }
    }
    Ok(Some(entries))
}

fn original<'a>(saved: Option<&'a Saved>, live: &'a str) -> Option<&'a str> {
    match saved {
        None => Some(live),
        Some(saved) if saved.applied == live => Some(&saved.baseline),
        _ => None,
    }
}

fn governors(dir: &Path, saved: Option<&Saved>) -> Option<String> {
    if !writable(&dir.join(GOV)) {
        return None;
    }
    let live = read(&dir.join(GOV)).ok()?;
    let baseline = original(saved, &live)?;
    let list = read(&dir.join("scaling_available_governors")).ok()?;
    let words: Vec<_> = list.split_ascii_whitespace().collect();
    if !words.contains(&baseline) || !words.contains(&live.as_str()) {
        return None;
    }
    let mut choices = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for w in words {
        if !token(w) {
            return None;
        }
        if w != "system" && seen.insert(w) {
            choices.push(format!("\"{w}\""))
        }
    }
    Some(choices.join(","))
}

fn frequencies(dir: &Path, saved: Option<&Saved>, selectable: bool) -> Option<String> {
    let get = |name| read(&dir.join(name)).ok();
    let low = freq(&get("scaling_min_freq")?)?;
    let live = get(MAX)?;
    let current = freq(&live)?;
    let hardware = freq(&get("cpuinfo_max_freq")?)?;
    let low = low.max(freq(&get("scaling_min_freq")?)?);
    if live != get(MAX)? {
        return None;
    }
    let choices = (|| {
        let high = freq(original(saved, &live)?)?.min(hardware);
        if !selectable || !(low..=hardware).contains(&current) || !writable(&dir.join(MAX)) {
            return None;
        }
        let table = get("scaling_available_frequencies")?;
        let mut choices = Vec::new();
        let mut seen = std::collections::HashSet::new();
        for word in table.split_ascii_whitespace() {
            let n = freq(word)?;
            if (low..=high).contains(&n) && seen.insert(n) {
                choices.push(word)
            }
        }
        Some(choices.join(","))
    })()
    .unwrap_or_default();
    Some(format!(
        "\"maxKHz\":[{choices}],\"minKHz\":{low},\"currentMaxKHz\":{current}"
    ))
}

fn probe(root: &Path, state: &Path) -> Result<String, String> {
    let saved = journal(state)?.unwrap_or_default();
    let mut rows = Vec::new();
    for (name, policy) in policies(root).map_err(|err| err.to_string())? {
        let dir = root.join(&name);
        let saved_field = |node: &str| saved.get(&(name.clone(), node.into()));
        let selectable = |node| {
            !policy.online.is_empty()
                && saved_field(node).is_none_or(|entry| entry.policy.matches(&policy))
        };
        let gov = if selectable(GOV) {
            governors(&dir, saved_field(GOV)).unwrap_or_default()
        } else {
            String::new()
        };
        let limits = frequencies(&dir, saved_field(MAX), selectable(MAX))
            .unwrap_or_else(|| "\"maxKHz\":[],\"minKHz\":null,\"currentMaxKHz\":null".into());
        let driver = &policy.identity.driver;
        let cpus = policy.identity.cpus.replace(' ', ",");
        let online = policy.online.replace(' ', ",");
        rows.push(format!(
            "{{\"id\":\"{name}\",\"cpus\":[{cpus}],\"onlineCpus\":[{online}],\"driver\":\"{driver}\",\"governors\":[{gov}],{limits}}}"
        ));
    }
    Ok(format!(
        "{{\"version\":1,\"policies\":[{}]}}",
        rows.join(",")
    ))
}

fn inspect_challenge() -> Result<String, Box<dyn std::error::Error>> {
    let challenge = env::var("INJECTOR_INSPECT_ID")?;
    if challenge.len() != 36
        || !challenge.bytes().enumerate().all(|(index, c)| match index {
            8 | 13 | 18 | 23 => c == b'-',
            _ => c.is_ascii_digit() || (b'a'..=b'f').contains(&c),
        })
    {
        return Err("Invalid CPU inspection challenge.".into());
    }
    Ok(challenge)
}

fn run() -> Result<String, Box<dyn std::error::Error>> {
    let event = env::var("INJECTOR_EVENT").map_err(|_| "Missing hook event.")?;
    if !matches!(
        event.as_str(),
        "enable" | "configure" | "run" | "disable" | "probe" | "inspect"
    ) {
        return Err("Unknown hook event.".into());
    }
    if unsafe { getuid() } != 0 {
        return Err("CPU frequency control requires authorized root.".into());
    }
    let state = env::var_os("PLUGIN_STATE_DIR")
        .filter(|s| !s.is_empty())
        .ok_or("Missing plugin state directory.")?;
    let boot = read(Path::new("/proc/sys/kernel/random/boot_id"))?;
    if boot.is_empty()
        || !boot
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c) || c == b'-')
    {
        return Err("Cannot identify this boot.".into());
    }
    let root = Path::new("/sys/devices/system/cpu/cpufreq");
    let state = Path::new(&state).join(format!("cpu-{boot}"));
    match event.as_str() {
        "probe" => probe(root, &state).map_err(Into::into),
        "inspect" => {
            let challenge = inspect_challenge()?;
            transaction::inspect(root, &state)?;
            Ok(format!("INSPECTED {challenge} CONSISTENT"))
        }
        _ => transaction::apply(root, &state, &event),
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(json) => {
            println!("{json}");
            ExitCode::SUCCESS
        }
        Err(msg) => {
            eprintln!("{msg}");
            if msg.is::<transaction::IncompleteRecovery>() {
                ExitCode::from(2)
            } else {
                ExitCode::FAILURE
            }
        }
    }
}
