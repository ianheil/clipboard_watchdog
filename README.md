# Clipboard Watchdog

Clipboard Watchdog is a Chrome extension that monitors and alerts you when websites access or modify your clipboard. It helps protect your privacy by detecting suspicious clipboard activity, logging attempts, and providing user controls.

## Features
- **Alerts** when a site tries to read, write, copy, cut, or paste your clipboard using JavaScript.
- **Logs** each attempt with site, action, result, and detection tags (background, no-gesture, overwrite-loop, exfiltration, etc.).
- **Badge & Icon:** Shows a badge counter and flashes an alert icon for new or suspicious activity.
- **Allowlist:** Silence alerts/logs for trusted domains.
- **Export:** Download your logs as CSV or JSON.
- **Block all clipboard access:** Aggressively blocks all JavaScript clipboard access (toggle in settings).
- **Settings:** Customize popup alerts, badge counter, log auto-clear, export format, and blocking behavior.
- **Privacy-first:** All logs and settings stay on your device. No clipboard data is ever sent anywhere.

## Installation
- **From Chrome Web Store:**
  1. Visit the [Chrome Web Store page](https://chrome.google.com/webstore/detail/clipboard-watchdog/your-extension-id).
  2. Click "Add to Chrome".
- **From source (for developers):**
  1. Clone this repo.
  2. Go to `chrome://extensions` in Chrome.
  3. Enable "Developer mode".
  4. Click "Load unpacked" and select the project folder (excluding test HTML files).

## Screenshots
![Popup UI](screenshots/popup.png)
![Settings Modal](screenshots/settings.png)

## Privacy Policy
Clipboard Watchdog does **not** collect, store, or transmit your clipboard data or browsing activity. All logs and settings stay on your device. See [PRIVACY.md](./PRIVACY.md) for details.

## Support & Feedback
- [Open an issue](https://github.com/ianheil/clipboard_watchdog/issues) on GitHub

## License
MIT 