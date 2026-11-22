use super::{read, token};
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt, fs, io,
    os::unix::fs::MetadataExt,
    path::Path,
};

// These memberships are used only to read journals made by the pre-discovery hooks.
fn legacy_cpus(id: &str) -> Option<&'static str> {
    match id {
        "policy0" => Some("0 1 2 3"),
        "policy4" => Some("4 5 6"),
        "policy7" => Some("7"),
        _ => None,
    }
}

pub(super) fn valid_id(id: &str) -> bool {
    id.strip_prefix("policy").and_then(cpu_number).is_some()
}

fn cpu_number(text: &str) -> Option<u32> {
    let number: u32 = text.parse().ok()?;
    (number.to_string() == text).then_some(number)
}

fn cpus(text: &str) -> Option<String> {
    let mut ids = BTreeSet::new();
    for word in text.split_ascii_whitespace() {
        if !ids.insert(cpu_number(word)?) {
            return None;
        }
    }
    Some(
        ids.into_iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(" "),
    )
}

#[derive(Clone, PartialEq, Eq)]
pub(super) struct Identity {
    pub(super) cpus: String,
    pub(super) driver: String,
    dev: u64,
    ino: u64,
}

pub(super) struct Policy {
    pub(super) identity: Identity,
    pub(super) online: String,
}

impl Policy {
    pub(super) fn read(root: &Path, id: &str) -> Option<Self> {
        let dir = root.join(id);
        let m = fs::symlink_metadata(&dir).ok()?;
        if !m.is_dir() {
            return None;
        }
        let members = cpus(&read(&dir.join("related_cpus")).ok()?)?;
        let driver = read(&dir.join("scaling_driver")).ok()?;
        if members.is_empty() || !token(&driver) {
            return None;
        }
        // Incomplete or inconsistent online data provides no write capability.
        let online = read(&dir.join("affected_cpus"))
            .ok()
            .and_then(|text| cpus(&text))
            .filter(|online| {
                online
                    .split_ascii_whitespace()
                    .all(|id| members.split(' ').any(|member| member == id))
            })
            .unwrap_or_default();
        let after = fs::symlink_metadata(&dir).ok()?;
        if (m.dev(), m.ino()) != (after.dev(), after.ino()) {
            return None;
        }
        Some(Self {
            identity: Identity {
                cpus: members,
                driver,
                dev: m.dev(),
                ino: m.ino(),
            },
            online,
        })
    }
}

pub(super) fn policies(root: &Path) -> io::Result<BTreeMap<String, Policy>> {
    let mut found = BTreeMap::new();
    let dirs = match fs::read_dir(root) {
        Ok(dirs) => dirs,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(found),
        Err(e) => return Err(e),
    };
    for entry in dirs {
        let entry = entry?;
        let Ok(id) = entry.file_name().into_string() else {
            continue;
        };
        if valid_id(&id) {
            if let Some(policy) = Policy::read(root, &id) {
                found.insert(id, policy);
            }
        }
    }
    Ok(found)
}

#[derive(Clone)]
pub(super) struct PolicyKey {
    id: String,
    identity: Option<Identity>,
}

impl PolicyKey {
    pub(super) fn current(id: &str, policy: &Policy) -> Self {
        Self {
            id: id.into(),
            identity: Some(policy.identity.clone()),
        }
    }

    pub(super) fn id(&self) -> &str {
        &self.id
    }

    pub(super) fn has_full_identity(&self) -> bool {
        self.identity.is_some()
    }

    pub(super) fn parse(field: &str) -> Option<Self> {
        if !field.contains('@') {
            legacy_cpus(field)?;
            return Some(Self {
                id: field.into(),
                identity: None,
            });
        }
        let fields: Vec<_> = field.split('@').collect();
        let [id, driver, dev, ino, membership] = fields.as_slice() else {
            return None;
        };
        let members = cpus(&membership.replace(',', " "))?;
        if !valid_id(id) || !token(driver) || members.is_empty() {
            return None;
        }
        Some(Self {
            id: id.to_string(),
            identity: Some(Identity {
                cpus: members,
                driver: driver.to_string(),
                dev: dev.parse().ok()?,
                ino: ino.parse().ok()?,
            }),
        })
    }

    pub(super) fn matches(&self, policy: &Policy) -> bool {
        match &self.identity {
            Some(identity) => identity == &policy.identity,
            None => legacy_cpus(&self.id) == Some(policy.identity.cpus.as_str()),
        }
    }

    pub(super) fn online(&self, root: &Path) -> bool {
        Policy::read(root, &self.id)
            .is_some_and(|policy| self.matches(&policy) && !policy.online.is_empty())
    }
}

impl fmt::Display for PolicyKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let Some(identity) = &self.identity else {
            return f.write_str(&self.id);
        };
        // Old hooks reject the encoded policy token, including when rolling back.
        write!(
            f,
            "{}@{}@{}@{}@{}",
            self.id,
            identity.driver,
            identity.dev,
            identity.ino,
            identity.cpus.replace(' ', ",")
        )
    }
}
