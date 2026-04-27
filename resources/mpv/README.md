# Bundled mpv binaries

Place the platform-specific `mpv` binary in the matching folder so it ships
with the packaged app. Each folder maps to `process.platform` /
`process.arch`:

```
resources/mpv/win32/x64/mpv.exe
resources/mpv/darwin/arm64/mpv          (libmpv build; macOS uses its own window)
resources/mpv/darwin/x64/mpv
resources/mpv/linux/x64/mpv
```

For Windows, grab a recent build from
<https://sourceforge.net/projects/mpv-player-windows/files/64bit/> and copy
just `mpv.exe` (and any required `.dll`s) into `resources/mpv/win32/x64/`.

For macOS, build mpv via Homebrew (`brew install mpv`) and copy the binary
from `$(brew --prefix mpv)/bin/mpv` into the right folder. Note that on
macOS `--wid` is not supported; mpv will open its own window.

For Linux, copy `/usr/bin/mpv` (or your distro's mpv) into
`resources/mpv/linux/x64/`.

If the bundled binary is missing at runtime, the app falls back to an mpv
on `PATH` and finally lets the user set a custom path in **Settings →
Player → Custom MPV path**.
