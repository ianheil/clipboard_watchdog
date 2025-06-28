# Clipboard Watchdog

Clipboard Watchdog is a Chrome extension that monitors and alerts you when websites access or modify your clipboard. It helps protect your privacy by detecting suspicious clipboard activity, logging attempts, and providing user controls.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/lkigpidloeacbmmocpnppnjimlmfedif?label=Chrome%20Web%20Store&color=4285f4)](https://chromewebstore.google.com/detail/clipboard-watchdog/lkigpidloeacbmmocpnppnjimlmfedif)

## 🐕 Install

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/clipboard-watchdog/lkigpidloeacbmmocpnppnjimlmfedif)**

## Features
- **Alerts** when a site tries to read, write, copy, cut, or paste your clipboard using JavaScript.
- **Logs** each attempt with site, action, result, and detection tags (background, no-gesture, overwrite-loop, exfiltration, etc.).
- **Exfiltration detection:** Flags when a clipboard read is quickly followed by a network request (fetch/XHR), which may indicate clipboard data exfiltration. **Note:** This does not guarantee clipboard data was sent—only that a suspicious pattern occurred.
- **Badge & Icon:** Shows a badge counter and flashes an alert icon for new or suspicious activity.
- **Allowlist:** Silence alerts/logs for trusted domains.
- **Export:** Download your logs as CSV or JSON.
- **Block all clipboard access:** Aggressively blocks all JavaScript clipboard access (toggle in settings).
- **Settings:** Customize popup alerts, badge counter, log auto-clear, export format, and blocking behavior.
- **Privacy-first:** All logs and settings stay on your device. No clipboard data is ever sent anywhere.

## Promo Images

**Small Promo Tile (440x280):**

![Small Promo Tile](screenshots/small_promo_tile.png)

**Marquee Promo Tile (1400x560):**

![Marquee Promo Tile](screenshots/CWD_promo-marquee.png)

## Screenshots
1. **Popup UI (main view)**  
   ![Popup UI](screenshots/1_popupUI.png)
2. **Settings modal**  
   ![Settings Modal](screenshots/2_popupUI_settings.png)
3. **Alert: Write detected, badge shown**  
   ![Alert Write with Badge](screenshots/3_alert_write_with_badge.png)
4. **Popup UI with new alert example**  
   ![Popup UI New Alert Example](screenshots/4_popupUI_newalert_example.png)
5. **Alert: Detected via legacy clipboard API**  
   ![Alert Detected via Legacy Clipboard API](screenshots/5_alert_detected-via-legacy-clipboard-API.png)
6. **Alert: No recent user gesture detected**  
   ![Alert No Recent User Gesture](screenshots/6_alert_no-recent-user-gesture.png)
7. **Alert: Exfiltration detected**  
   ![Alert Exfiltration](screenshots/7_alert_exfiltration.png)

## Privacy Policy
Clipboard Watchdog does **not** collect, store, or transmit your clipboard data or browsing activity. All logs and settings stay on your device. See [PRIVACY.md](./PRIVACY.md) for details.

## Support & Feedback
- [Install from Chrome Web Store](https://chromewebstore.google.com/detail/clipboard-watchdog/lkigpidloeacbmmocpnppnjimlmfedif)
- [Open an issue](https://github.com/ianheil/clipboard_watchdog/issues) on GitHub

## License
MIT 