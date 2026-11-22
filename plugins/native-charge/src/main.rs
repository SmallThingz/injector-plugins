mod lease;
mod monitor;

use lease::Lease;
use monitor::{Controller, Error, Result, WindowUpdate};
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

fn form_percent(value: &str) -> Option<u8> {
    let mut digits = [0; 3];
    let mut len = 0;
    let mut bytes = value.bytes();
    while let Some(byte) = bytes.next() {
        // A decoded percentage can only contain decimal digits.
        let digit = match byte {
            b'%' => {
                let high = (bytes.next()? as char).to_digit(16)?;
                let low = (bytes.next()? as char).to_digit(16)?;
                (high * 16 + low) as u8
            }
            other => other,
        };
        if !digit.is_ascii_digit() {
            return None;
        }
        *digits.get_mut(len)? = digit;
        len += 1;
    }
    percent(std::str::from_utf8(&digits[..len]).ok()?).ok()
}

fn config_window(payload: &str) -> Option<(u8, u8)> {
    let mut resume = None;
    let mut stop = None;
    for field in payload.split(' ') {
        let (key, value) = field.split_once('=')?;
        let slot = match key {
            "resume_percent" => &mut resume,
            "stop_percent" => &mut stop,
            _ => return None,
        };
        if slot.is_some() {
            return None;
        }
        *slot = Some(form_percent(value)?);
    }
    let (resume, stop) = (resume?, stop?);
    (resume < stop).then_some((resume, stop))
}

fn run() -> Result<()> {
    let session = env::var("INJECTOR_SESSION_ID").unwrap_or_default();
    let event = env::var("INJECTOR_EVENT").unwrap_or_default();
    if !uuid(&session)
        || env::var("INJECTOR_SESSION_PROTOCOL").as_deref() != Ok("stdin-lease-v1")
        || env::var("INJECTOR_SESSION_LEASE_SECONDS").as_deref() != Ok("15")
        || !matches!(event.as_str(), "monitor" | "disable" | "inspect")
    {
        return Err(Error::failure("Invalid charging monitor contract"));
    }
    if event == "inspect" {
        let state = Controller::discover(&session)
            .and_then(|controller| controller.inspect())
            .unwrap_or("UNREADABLE");
        println!("INSPECTED {session} {state}");
        return Ok(());
    }
    let mut controller = Controller::discover(&session)?;
    if event == "disable" {
        controller.restore()?;
        println!("RESTORED {session}");
        return Ok(());
    }
    let mut resume =
        percent(&env::var("INJECTOR_INPUT_resume_percent").unwrap_or_else(|_| "75".into()))?;
    let mut stop =
        percent(&env::var("INJECTOR_INPUT_stop_percent").unwrap_or_else(|_| "80".into()))?;
    if resume >= stop {
        return Err(Error::failure("Resume must be below stop"));
    }
    let mut lease = Lease::new()?;
    eprintln!("Charging enforcement is unverified.");
    // A stalled reader cannot hold the monitor past its lease on an ACK write.
    let flags = unsafe { libc::fcntl(1, libc::F_GETFL) };
    if flags < 0 || unsafe { libc::fcntl(1, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 {
        return Err(io::Error::last_os_error().into());
    }
    let _owner = controller.start()?;
    let mut out = io::stdout().lock();
    let result = (|| {
        let mut sequence = 1i32;
        let mut config_sequence = Some(1i64);
        while let Some(frame) = lease.frame()? {
            if frame == format!("STOP {session}") {
                break;
            }
            if let Some(config) = frame.strip_prefix("CONFIG ") {
                let mut fields = config.splitn(3, ' ');
                let Some(seq) = config_sequence else {
                    return Err(Error::failure("Charging configuration sequence exhausted"));
                };
                if sequence == 1
                    || fields.next() != Some(session.as_str())
                    || fields.next() != Some(seq.to_string().as_str())
                {
                    return Err(Error::failure("Unexpected charging configuration frame"));
                }
                if !lease.current()? {
                    break;
                }
                let mut reply = "REJECTED";
                if let Some((new_resume, new_stop)) = config_window(fields.next().unwrap_or("")) {
                    if let WindowUpdate::Applied = controller.tick(new_resume, new_stop, &lease)? {
                        (resume, stop) = (new_resume, new_stop);
                        reply = "CONFIGURED";
                    }
                }
                if !lease.current()? {
                    break;
                }
                writeln!(out, "{reply} {session} {seq}")?;
                out.flush()?;
                config_sequence = seq.checked_add(1);
                continue;
            }
            if frame != format!("HEARTBEAT {session} {sequence}") {
                return Err(Error::failure("Unexpected charging session frame"));
            }
            if !lease.current()? {
                break;
            }
            lease.renew()?;
            controller.tick(resume, stop, &lease)?.require_applied()?;
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
