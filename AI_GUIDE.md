# AI Maintenance Guide for Zalo-for-Linux

This document serves as a technical grounding for AI agents assisting in the maintenance and evolution of the `zalo-for-linux` repository.

## Core Architecture

Zalo for Linux is an **Electron Wrapper**. It does not contain the Zalo application source code. Instead, it:

1. Downloads the official **Zalo macOS DMG**.
2. Extracts `app.asar` from the DMG.
3. Patches the extracted code for Linux compatibility.
4. Wraps it in a custom `main.js` that handles Linux-specific needs (Tray, DevTools, Window management).

## Technical Logic & Patching Patterns

### 1. The "Login Freeze" Fix (SQLite3)

Zalo's macOS version bundles Mach-O binaries for SQLite3. On Linux, this causes an "invalid ELF header" error, leading to a silent freeze at the login screen.

- **Logic**: The `scripts/prepare-app.js` replaces the macOS `.node` file with a Linux-compatible one.
- **Source**: `node_modules/sqlite3/build/Release/node_sqlite3.node` (installed via npm on the host Linux system).
- **Target**: `app/native/nativelibs/sqlite3/binding/napi-v6-linux-x64/node_sqlite3.node`.

### 2. UI Enhancements (Title Bar)

Zalo defaults to a frameless window on macOS.

- **Logic**: Search for the pattern `T,frame:!1` in the extracted `main.js` and replace it with `T,frame:!0`.
- **Effect**: Enables native title bars/borders which are expected by Linux desktop environments.

### 3. Bootstrap Flow

The project's `main.js` acts as a pre-loader.

- It initializes the `Tray` icon and global shortcuts (e.g., `Ctrl+Shift+I` for DevTools).
- It then calls `require(path.join(appPath, 'bootstrap.js'))` to hand over control to the actual Zalo application logic.

## Project Philosophies

### Automation-First

- Use `npm run` scripts for everything:
  - `download-dmg`: Fetches the latest macOS DMG.
  - `prepare-app`: Extracts and patches (requires `7z`).
  - `build`: Packages the AppImage and deb/rpm files.
- Recently added CLI automation allows for non-interactive builds via environment variables (e.g., `ZALO_VERSION`).

### Installation Standardization

- The project explicitly recommends **Gear Lever** for handling AppImages on Linux.
- Documentation should favor CLI-based or well-standardized GUI tools (like Gear Lever) over manual "chmod +x" instructions.

## Troubleshooting Guidance for AI

- **If the app freezes on start**: Check if the SQLite3 patch was applied correctly.
- **If the build fails in CI**: Ensure `7z` and `fakeroot` are available. Check if the DMG download link is still valid.
- **If Zalo's code changes**: Patch patterns (like the `T,frame:!1` regex) may need updating if Zalo's minification changes.
