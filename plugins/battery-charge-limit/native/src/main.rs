mod lease;
mod monitor;

use lease::Lease;
use monitor::{Controller, Error, Result};
use std::{
    env,
    io::{self, Write},
    process,
};

const FIRMWARE: &str =
    "Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys";

fn uuid(s: &str) -> bool {
    s.len() == 36
        && s.bytes().enumerate().all(|(i, c)| {
            if [8, 13, 18, 23].contains(&i) {
                c == b'-'
            } else {
                c.is_ascii_digit() || (b'a'..=b'f').contains(&c)
            }
        })
}

fn percent(s: &str) -> Result<u8> {
    s.parse::<u8>()
        .ok()
        .filter(|v| *v <= 100 && v.to_string() == s)
        .ok_or_else(|| Error::failure("Invalid battery percentage"))
}

fn run() -> Result<()> {
    let session = env::var("INJECTOR_SESSION_ID").unwrap_or_default();
    if !uuid(&session)
        || env::var("INJECTOR_SESSION_PROTOCOL").as_deref() != Ok("stdin-lease-v1")
        || env::var("INJECTOR_SESSION_LEASE_SECONDS").as_deref() != Ok("15")
        || env::var("INJECTOR_EVENT").as_deref() != Ok("monitor")
    {
        return Err(Error::failure("Invalid charging monitor contract"));
    }
    let resume =
        percent(&env::var("INJECTOR_INPUT_resume_percent").unwrap_or_else(|_| "75".into()))?;
    let stop = percent(&env::var("INJECTOR_INPUT_stop_percent").unwrap_or_else(|_| "80".into()))?;
    if resume >= stop {
        return Err(Error::failure("Resume must be below stop"));
    }
    let mut lease = Lease::new()?;
    let controller = Controller::discover(&session)?;
    eprintln!("Charging enforcement is unverified.");
    // A stalled reader cannot hold the monitor past its lease on an ACK write.
    let flags = unsafe { libc::fcntl(1, libc::F_GETFL) };
    if flags < 0 || unsafe { libc::fcntl(1, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 {
        return Err(io::Error::last_os_error().into());
    }
    controller.start()?;
    let mut out = io::stdout().lock();
    let result = (|| {
        let mut sequence = 1i32;
        while let Some(frame) = lease.frame()? {
            if frame == format!("STOP {session}") {
                break;
            }
            if frame != format!("HEARTBEAT {session} {sequence}") {
                return Err(Error::failure("Unexpected charging session frame"));
            }
            if !lease.current()? {
                break;
            }
            lease.renew()?;
            controller.tick(resume, stop, &lease)?;
            if !lease.current()? {
                break;
            }
            if sequence == 1 {
                writeln!(out, "READY {session}")?;
            }
            writeln!(out, "ACK {session} {sequence}")?;
            out.flush()?;
            if sequence == i32::MAX {
                break;
            }
            sequence += 1;
        }
        Ok(())
    })();
    if matches!(result, Err(Error(3, _))) {
        return result;
    }
    controller.cleanup()?;
    writeln!(out, "RESTORED {session}")?;
    out.flush()?;
    match result {
        Err(Error(4, message)) => {
            let _ = writeln!(io::stderr(), "{message}");
            Ok(())
        }
        other => other,
    }
}

fn main() {
    if let Err(Error(code, message)) = run() {
        eprintln!("{message}");
        process::exit(code);
    }
}
