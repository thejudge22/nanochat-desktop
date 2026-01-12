# GitHub Release Instructions

This document provides step-by-step instructions for creating and publishing a new release of **NanoChat Desktop**.

## How to Create a GitHub Release

### 1. Update Version Numbers
Before building, ensure the version number is updated in the following files:
- [`package.json`](package.json) (the `"version"` field)
- [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) (the `"version"` field)

### 2. Build the Project
Use the provided [`build.sh`](build.sh) script to build the production artifacts. This script includes necessary workarounds for modern Linux distributions.

```bash
# Build all supported bundles (AppImage, deb, rpm)
./build.sh
```

The build artifacts will be located in:
`src-tauri/target/release/bundle/`

### 3. Tag the Release
Create a git tag for the new version. Use semantic versioning (e.g., `v0.1.0`).

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
```

### 4. Push the Tag
Push the newly created tag to GitHub.

```bash
git push origin v0.1.0
```

### 5. Create the Release on GitHub
1. Navigate to the "Releases" section of the repository on GitHub.
2. Click "Draft a new release".
3. Select the tag you just pushed (`v0.1.0`).
4. Enter the Release Title (e.g., `NanoChat Desktop v0.1.0`).
5. Use the [Release Notes Template](#release-notes-template) below for the description.
6. **Upload Build Artifacts**: Drag and drop the files from `src-tauri/target/release/bundle/` (e.g., `.AppImage`, `.deb`, `.rpm`) into the release.
7. Click "Publish release".

---

## Release Notes Template

Copy and use the following template for the GitHub release description:

```markdown
# NanoChat Desktop [Version Number]

Released on: [YYYY-MM-DD]

## What's New
- [Feature 1 description]
- [Feature 2 description]

## Bug Fixes
- [Fix 1 description]
- [Fix 2 description]

## Known Issues
- [Optional: Describe any known issues]

## Installation Instructions

### Linux
- **AppImage**: Download the `.AppImage` file, make it executable (`chmod +x ...`), and run it.
- **Debian/Ubuntu**: Install using `sudo dpkg -i [filename].deb`.
- **Fedora/RHEL**: Install using `sudo rpm -i [filename].rpm`.

### Flatpak (Manual Build)
If you prefer Flatpak, you can build it locally using:
```bash
flatpak-builder --user --install --force-clean build-flatpak org.nanochat.desktop.json
```