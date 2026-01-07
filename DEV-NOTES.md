# Important Development Notes

## PKG_CONFIG_PATH Issue

**Issue**: System is using Homebrew's pkg-config which only searches Homebrew directories (`/home/linuxbrew/.linuxbrew/...`) by default, not system directories where GTK3 and WebKit packages are installed (`/usr/lib/x86_64-linux-gnu/pkgconfig`).

**Solution**: Always export PKG_CONFIG_PATH before running Tauri commands:
```bash
export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig:/home/linuxbrew/.linuxbrew/lib/pkgconfig:/home/linuxbrew/.linuxbrew/share/pkgconfig"
```

**Convenience Scripts**:
- Use `./dev.sh` instead of `npm run tauri:dev`
- This script sets the correct PKG_CONFIG_PATH automatically

## Running the Application

**Development mode**:
```bash
./dev.sh
```

**Manual method**:
```bash
export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig:/home/linuxbrew/.linuxbrew/lib/pkgconfig:/home/linuxbrew/.linuxbrew/share/pkgconfig"
npm run tauri:dev
```
