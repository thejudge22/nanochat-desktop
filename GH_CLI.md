# GitHub CLI Integration

This document describes the GitHub CLI (`gh`) integration for the NanoChat Desktop project, which provides streamlined workflows for releases, pull requests, and issue management.

## Prerequisites

Install the GitHub CLI:
```bash
# macOS
brew install gh

# Linux (Debian/Ubuntu)
sudo apt install gh

# Linux (Fedora)
sudo dnf install gh

# Windows
winget install GitHub.cli
```

Authenticate with GitHub:
```bash
gh auth login
```

## Available npm Scripts

### Git Operations

| Command | Description |
|---------|-------------|
| `npm run git:push` | Push current branch to origin |
| `npm run git:push:tags` | Push all tags to origin |

### Pull Requests

| Command | Description |
|---------|-------------|
| `npm run pr` | Create a new PR with auto-filled title/body from commits |
| `npm run pr:view` | Open current PR in web browser |

Example workflow:
```bash
git checkout -b feature/new-feature
# ... make changes and commit ...
npm run git:push
npm run pr
```

### Releases

| Command | Description |
|---------|-------------|
| `npm run release` | Build and create a **draft** GitHub release with all artifacts |
| `npm run release:publish` | Build and create a **published** GitHub release |
| `npm run release:view` | View latest release in web browser |

#### Release Process

The release script supports two methods for versioning:

##### Method 1: Branch-Based Versioning (Recommended)

Use a branch name with the version pattern `vXY` where X is major, Y is minor:

```bash
# For version 0.3.0
git checkout -b v03

# For version 1.2.0
git checkout -b v12

# Also works with prefixes
git checkout -b release-v04  # Creates v0.4.0
```

The script will automatically:
- Detect the version from branch name
- Update `package.json` and `src-tauri/tauri.conf.json`
- Create the release tag (e.g., `v0.3.0`)

Then simply run:
```bash
npm run release
```

##### Method 2: Manual Versioning

1. **Update version numbers** in both files:
   - [`package.json`](package.json) - `"version"` field
   - [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) - `"version"` field

2. **Create a draft release**:
   ```bash
   npm run release
   ```

##### Review and Publish

After creating a draft release (either method):

1. **Review the draft**:
   ```bash
   npm run release:view
   ```

2. **Publish when ready**:
   ```bash
   # Option 1: Via web interface (opens in browser)
   npm run release:view

   # Option 2: Via CLI
   gh release edit v0.3.0 --draft=false
   ```

3. **Or publish immediately** (skip draft):
   ```bash
   npm run release:publish
   ```

#### What the Release Script Does

The [`scripts/release.sh`](scripts/release.sh) script automates the entire release process:

1. **Version Detection**:
   - Checks if branch name matches pattern `vXY` (e.g., `v03`, `v12`)
   - If matched, automatically updates `package.json` and `tauri.conf.json`
   - Otherwise, extracts version from `package.json`

2. **Validation**:
   - Validates version matches in both config files
   - Checks if tag already exists

3. **Build Process**:
   - Runs [`build.sh`](build.sh) to create all Linux bundles
   - Collects build artifacts:
     - `*.AppImage` from `src-tauri/target/release/bundle/appimage/`
     - `*.deb` from `src-tauri/target/release/bundle/deb/`
     - `*.rpm` from `src-tauri/target/release/bundle/rpm/`

4. **Release Creation**:
   - Creates GitHub release with tag `v{version}`
   - Uploads all artifacts
   - Generates release notes from git commits

### Issues

| Command | Description |
|---------|-------------|
| `npm run issues` | List all open issues |
| `npm run issue:create` | Create a new issue interactively |
| `npm run issue:view` | View an issue (prompts for issue number) |

Additional `gh issue` commands:
```bash
# Close an issue
gh issue close 123

# View issue in browser
gh issue view 123 --web

# Search issues
gh issue list --label bug
gh issue list --assignee @me
```

## Direct `gh` CLI Usage

You can also use `gh` commands directly for more advanced workflows:

### Pull Requests
```bash
# Create PR with custom title/body
gh pr create --title "Fix bug" --body "Description"

# List PRs
gh pr list

# Review a PR
gh pr review 123 --approve
gh pr review 123 --comment --body "LGTM"

# Merge a PR
gh pr merge 123 --squash
```

### Releases
```bash
# List releases
gh release list

# View a specific release
gh release view v0.2.0

# Edit release notes
gh release edit v0.2.0 --notes "Updated release notes"

# Delete a release
gh release delete v0.2.0
```

### Repository Management
```bash
# View repo in browser
gh repo view --web

# Clone the repo
gh repo clone username/nanochat-desktop

# Create a fork
gh repo fork
```

## Workflow Examples

### Feature Development
```bash
# 1. Create feature branch
git checkout -b feature/awesome-feature

# 2. Make changes and commit
git add .
git commit -m "Add awesome feature"

# 3. Push and create PR
npm run git:push
npm run pr
```

### Bug Fix with Issue Reference
```bash
# 1. Create issue
npm run issue:create
# (creates issue #42)

# 2. Create branch
git checkout -b fix/issue-42

# 3. Fix and commit
git commit -m "Fix issue #42: Description"

# 4. Push and create PR
npm run git:push
npm run pr

# 5. After merge, close issue
gh issue close 42
```

### Release Workflow (Branch-Based)
```bash
# 1. Create version branch
git checkout -b v03

# 2. Make any final changes
git add .
git commit -m "Prepare v0.3.0 release"
npm run git:push

# 3. Create release (auto-updates version files)
npm run release

# 4. Review draft release
npm run release:view

# 5. Publish when ready
gh release edit v0.3.0 --draft=false

# 6. Merge back to main
git checkout main
git merge v03
npm run git:push
```

### Release Workflow (Manual Versioning)
```bash
# 1. Update versions manually
# Edit package.json and src-tauri/tauri.conf.json to v0.3.0

# 2. Commit version bump
git add package.json src-tauri/tauri.conf.json
git commit -m "Bump version to 0.3.0"
npm run git:push

# 3. Create release
npm run release

# 4. Review draft release
npm run release:view

# 5. Publish when ready
gh release edit v0.3.0 --draft=false
```

## Tips and Best Practices

1. **Use branch-based versioning** - Branch names like `v03`, `v12` automatically set versions
2. **Always create draft releases first** - Review artifacts before publishing
3. **Use semantic versioning** - MAJOR.MINOR.PATCH (e.g., 0.2.0)
4. **Generate release notes** - The script auto-generates from commits, but you can edit them
5. **Reference issues in commits** - Use `#123` in commit messages to link to issues
6. **Use PR templates** - Create `.github/pull_request_template.md` for consistency

## Troubleshooting

### Release script fails
- Ensure versions match in both `package.json` and `src-tauri/tauri.conf.json`
- Check that the tag doesn't already exist: `git tag -l`
- Verify build artifacts exist in `src-tauri/target/release/bundle/`

### Authentication issues
```bash
# Re-authenticate
gh auth login

# Check status
gh auth status
```

### Can't find `gh` command
Ensure GitHub CLI is installed and in your PATH:
```bash
which gh
gh --version
```

## See Also

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [RELEASE.md](RELEASE.md) - Manual release process documentation
- [build.sh](build.sh) - Build script with Linux workarounds