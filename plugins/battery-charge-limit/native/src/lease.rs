use crate::monitor::{Error, Result};
use std::{
    fs, io,
    os::{
        fd::{AsRawFd, FromRawFd, OwnedFd},
        unix::fs::FileTypeExt,
    },
};

fn fd(raw: i32) -> io::Result<OwnedFd> {
    if raw < 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(unsafe { OwnedFd::from_raw_fd(raw) })
    }
}

fn now() -> io::Result<i64> {
    let mut value = libc::timespec {
        tv_sec: 0,
        tv_nsec: 0,
    };
    if unsafe { libc::clock_gettime(libc::CLOCK_BOOTTIME, &mut value) } < 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(value.tv_sec * 1_000_000_000 + value.tv_nsec)
}

pub struct Lease {
    timer: OwnedFd,
    signals: OwnedFd,
    deadline: i64,
    buffer: [u8; 256],
    start: usize,
    end: usize,
}

impl Lease {
    pub fn new() -> Result<Self> {
        if !fs::metadata("/proc/self/fd/0")?.file_type().is_fifo() {
            return Err(Error::failure("Expected control pipe"));
        }
        // One foreground thread. Block handled signals before acquiring any state.
        let signals = unsafe {
            let mut set = std::mem::zeroed();
            libc::sigemptyset(&mut set);
            for sig in [libc::SIGHUP, libc::SIGINT, libc::SIGTERM] {
                libc::sigaddset(&mut set, sig);
            }
            if libc::sigprocmask(libc::SIG_BLOCK, &set, std::ptr::null_mut()) < 0 {
                return Err(io::Error::last_os_error().into());
            }
            fd(libc::signalfd(-1, &set, libc::SFD_CLOEXEC))?
        };
        let timer = fd(unsafe { libc::timerfd_create(libc::CLOCK_BOOTTIME, libc::TFD_CLOEXEC) })?;
        let mut lease = Self {
            timer,
            signals,
            deadline: 0,
            buffer: [0; 256],
            start: 0,
            end: 0,
        };
        lease.renew()?;
        Ok(lease)
    }
    fn stop_requested(&self) -> io::Result<bool> {
        let mut signal = libc::pollfd {
            fd: self.signals.as_raw_fd(),
            events: libc::POLLIN,
            revents: 0,
        };
        if unsafe { libc::poll(&mut signal, 1, 0) } < 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(signal.revents != 0)
    }
    pub fn current(&self) -> Result<bool> {
        if self.stop_requested()? {
            return Err(Error::failure("Charging monitor interrupted"));
        }
        Ok(now()? < self.deadline)
    }
    pub fn renew(&mut self) -> Result<()> {
        let timestamp = now()?;
        if self.deadline != 0 && timestamp >= self.deadline {
            return Err(Error(4, "Charging lease expired".into()));
        }
        self.deadline = timestamp + 15_000_000_000;
        let spec = libc::itimerspec {
            it_interval: libc::timespec {
                tv_sec: 0,
                tv_nsec: 0,
            },
            it_value: libc::timespec {
                tv_sec: self.deadline / 1_000_000_000,
                tv_nsec: self.deadline % 1_000_000_000,
            },
        };
        if unsafe {
            libc::timerfd_settime(
                self.timer.as_raw_fd(),
                libc::TFD_TIMER_ABSTIME,
                &spec,
                std::ptr::null_mut(),
            )
        } < 0
        {
            return Err(io::Error::last_os_error().into());
        }
        Ok(())
    }
    pub fn frame(&mut self) -> Result<Option<String>> {
        let mut frame = String::new();
        loop {
            if !self.current()? {
                return Err(Error(4, "Charging session lease expired.".into()));
            }
            if self.start == self.end {
                let mut fds =
                    [0, self.timer.as_raw_fd(), self.signals.as_raw_fd()].map(|fd| libc::pollfd {
                        fd,
                        events: libc::POLLIN,
                        revents: 0,
                    });
                if unsafe { libc::poll(fds.as_mut_ptr(), 3, -1) } < 0 {
                    let e = io::Error::last_os_error();
                    if e.kind() == io::ErrorKind::Interrupted {
                        continue;
                    }
                    return Err(e.into());
                }
                if fds[1].revents != 0 || fds[2].revents != 0 {
                    continue;
                }
                // Raw pipe read avoids a second userspace buffer invisible to poll.
                let n =
                    unsafe { libc::read(0, self.buffer.as_mut_ptr().cast(), self.buffer.len()) };
                if n < 0 {
                    return Err(io::Error::last_os_error().into());
                }
                self.end = n as usize;
                self.start = 0;
                if self.end == 0 {
                    return Ok(None);
                }
            }
            while self.start < self.end {
                let byte = self.buffer[self.start];
                self.start += 1;
                if byte == b'\n' {
                    return Ok(Some(frame));
                }
                if frame.len() == 63
                    || !(byte.is_ascii_alphanumeric() || byte == b' ' || byte == b'-')
                {
                    return Err(Error::failure("Invalid charging session frame"));
                }
                frame.push(byte as char);
            }
        }
    }
}
