// Content script for Clipboard Watchdog
// Injects detection logic, listens for clipboard and exfiltration events, and handles logging and alerts.

// IMMEDIATE EXIT if extension is disabled - check this first before anything else
chrome.storage.local.get({ extensionDisabled: false }, (data) => {
  if (data.extensionDisabled === true) {
    console.log('[Clipboard Watchdog] Extension globally disabled - exiting immediately');
    return; // Exit immediately, don't run any other code
  }
  
  // Only continue if not disabled
  initializeExtension();
});

function initializeExtension() {
  // Inject injected.js as a file into the page context
  function injectClipboardWatchdog() {
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL('injected.js');
    (document.head || document.documentElement).appendChild(s);
    s.onload = function() { s.remove(); };
  }

  // Guard: Only add the message event listener once per frame
  if (!window._clipboardWatchdogListenerAdded) {
    window.addEventListener('message', function(event) {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== 'clipboard-watchdog') return;

      // Handle exfiltration events from injected.js
      if (event.data.type === 'exfiltration') {
        logExfiltrationAttempt(event.data.method, event.data.timestamp);
        return;
      }

      // Handle block events (from block-clipboard.js)
      if (event.data.type === 'block') {
        if (["copy", "read", "write", "cut", "paste"].includes(event.data.action)) {
          logBlockedAttempt(event.data.action);
        }
        // Suppress all other block messages
        return;
      }

      // Handle normal clipboard events
      const { type, status, error, command } = event.data;
      if (type === 'execCommand') {
        logAttempt(command, 'allowed', undefined, true);
      } else {
        logAttempt(type, status, error);
      }
    });
    window._clipboardWatchdogListenerAdded = true;
  }

  // Track last user gesture timestamp for suspicious activity detection
  let lastUserGesture = 0;
  ['mousedown', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      lastUserGesture = Date.now();
    }, true);
  });

  // Overwrite loop detection: track recent writes per site
  const clipboardWriteTimestamps = {};

  // Read-then-exfiltrate detection: track recent reads per site
  const clipboardReadTimestamps = {};

  // Generate a human-readable message for each clipboard action
  function getClipboardActionMessage(type, isLegacy) {
    if (type === 'copy' || type === 'write') {
      return `write to your clipboard${isLegacy ? ' (detected via legacy clipboard API)' : ''}`;
    }
    if (type === 'cut') {
      return `cut (remove and copy) your clipboard content${isLegacy ? ' (detected via legacy clipboard API)' : ''}`;
    }
    if (type === 'paste' || type === 'read') {
      return `read from your clipboard${isLegacy ? ' (detected via legacy clipboard API)' : ''}`;
    }
    return `${type} your clipboard${isLegacy ? ' (detected via legacy clipboard API)' : ''}`;
  }

  // Increment unseen and session alert counts
  function incrementAlertCounts(callback) {
    chrome.storage.local.get({ unseenAlertCount: 0 }, (localData) => {
      const unseen = (localData.unseenAlertCount || 0) + 1;
      chrome.storage.local.set({ unseenAlertCount: unseen }, () => {
        // Session count in session storage if available, else local
        const sessionStore = chrome.storage.session || chrome.storage.local;
        sessionStore.get({ sessionAlertCount: 0 }, (sessionData) => {
          const session = (sessionData.sessionAlertCount || 0) + 1;
          sessionStore.set({ sessionAlertCount: session }, () => {
            // Always update badge, let background.js decide if it should show
            if (chrome.runtime && chrome.runtime.id && typeof chrome.runtime.sendMessage === 'function') {
              chrome.runtime.sendMessage({ type: 'updateBadge', count: unseen });
            }
            if (callback) callback(unseen, session);
          });
        });
      });
    });
  }

  // Show a popup alert if enabled in settings
  function showClipboardAlert(alertMsg) {
    chrome.storage.local.get({ popupAlerts: true }, (data) => {
      if (data.popupAlerts !== false) {
        alert(alertMsg);
      }
    });
  }

  // Log a clipboard access attempt and show alerts as needed
  function logAttempt(type, status, error, isLegacy) {
    const site = location.hostname;
    const timestamp = new Date().toISOString();
    const key = `cw_log_${timestamp}`;
    const isBackground = document.visibilityState !== 'visible';
    const timeSinceGesture = Date.now() - lastUserGesture;
    const noRecentGesture = timeSinceGesture > 1500; // 1.5s window

    // Overwrite loop detection
    let overwriteLoopDetected = false;
    if (type === 'copy' || type === 'write') {
      if (!clipboardWriteTimestamps[site]) clipboardWriteTimestamps[site] = [];
      clipboardWriteTimestamps[site].push(Date.now());
      // Keep only last 5 seconds
      clipboardWriteTimestamps[site] = clipboardWriteTimestamps[site].filter(ts => Date.now() - ts < 5000);
      if (clipboardWriteTimestamps[site].length > 3) {
        overwriteLoopDetected = true;
      }
    }

    // Early exit if extension context is invalid
    if (!chrome.runtime || !chrome.runtime.id) return;

    chrome.storage.local.get({ allowlist: [], alertCount: 0 }, (data) => {
      // Early exit if extension context is invalid
      if (!chrome.runtime || !chrome.runtime.id) return;

      const allowlist = data.allowlist || [];
      if (allowlist.includes(site)) {
        return;
      }

      chrome.storage.local.set({
        [key]: { site, type, status, error, timestamp, background: isBackground, legacy: !!isLegacy, noRecentGesture, overwriteLoopDetected },
        alertCount: (data.alertCount || 0) + 1
      }, () => {
        // Early exit if extension context is invalid
        if (!chrome.runtime || !chrome.runtime.id) return;
        try {
          if (typeof chrome.runtime.sendMessage === 'function') {
            chrome.runtime.sendMessage({ type: 'alertBadgeAndIcon' });
            chrome.runtime.sendMessage({ type: 'newAlert' });
            if (isBackground) {
              chrome.runtime.sendMessage({
                type: 'backgroundClipboardAccess',
                site,
                action: getClipboardActionMessage(type, isLegacy),
                timestamp
              });
            }
          }
          console.log(`[Clipboard Watchdog] Logged ${type} (${status || 'allowed'}) attempt from ${site} at ${timestamp}${isBackground ? ' [background]' : ''}${error ? ' [error: ' + error + ']' : ''}${isLegacy ? ' [legacy API]' : ''}${noRecentGesture ? ' [no recent user gesture]' : ''}${overwriteLoopDetected ? ' [overwrite loop detected]' : ''}`);
        } catch (e) {
          // Ignore errors if extension context is invalidated
        }
      });

      let alertMsg = `⚠️ Clipboard Watchdog: This site tried to ${getClipboardActionMessage(type, isLegacy)}.`;
      if (noRecentGesture) {
        alertMsg += `\n(Suspicious: No recent user gesture)`;
      }
      if (overwriteLoopDetected) {
        alertMsg += `\n⚠️ Suspicious: Clipboard overwrite loop detected!`;
      }
      if (status === 'denied') {
        alertMsg += `\nRequest was denied${error ? ': ' + error : ''}.`;
      }
      if (isBackground) {
        alertMsg += `\n(This happened in the background tab!)`;
      }
      showClipboardAlert(alertMsg);
    });

    // Track recent reads for exfiltration detection
    if (type === 'read' || type === 'paste') {
      if (!clipboardReadTimestamps[site]) clipboardReadTimestamps[site] = [];
      clipboardReadTimestamps[site].push(Date.now());
      clipboardReadTimestamps[site] = clipboardReadTimestamps[site].filter(ts => Date.now() - ts < 2000);
    }
  }

  // Log and alert for exfiltration attempts
  function logExfiltrationAttempt(method, timestamp) {
    const site = location.hostname;
    const key = `cw_log_${timestamp || new Date().toISOString()}`;
    if (!chrome.runtime || !chrome.runtime.id) return;
    chrome.storage.local.get({ allowlist: [], alertCount: 0 }, (data) => {
      const allowlist = data.allowlist || [];
      if (allowlist.includes(site)) return;
      chrome.storage.local.set({
        [key]: { site, type: 'exfiltration', method, status: 'detected', timestamp: timestamp || new Date().toISOString() },
        alertCount: (data.alertCount || 0) + 1
      }, () => {
        if (!chrome.runtime || !chrome.runtime.id) return;
        try {
          if (typeof chrome.runtime.sendMessage === 'function') {
            chrome.runtime.sendMessage({ type: 'alertBadgeAndIcon' });
            chrome.runtime.sendMessage({ type: 'newAlert' });
          }
          console.log(`[Clipboard Watchdog] Exfiltration detected via ${method} from ${site} at ${timestamp}`);
        } catch (e) {}
      });
      // Always show alert for exfiltration
      alert(`⚠️ Clipboard Watchdog: Clipboard read was followed by a network request (${method})!\nThis may indicate clipboard data exfiltration.`);
    });
  }

  // Block clipboard access if setting is enabled
  function injectBlockClipboardScript() {
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL('block-clipboard.js');
    (document.head || document.documentElement).appendChild(s);
    s.onload = function() { s.remove(); };
  }

  // Inject or remove the blocking script based on settings
  chrome.storage.local.get({ blockClipboard: false }, (data) => {
    if (data.blockClipboard === true) {
      injectBlockClipboardScript();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blockClipboard) {
      if (changes.blockClipboard.newValue) {
        injectBlockClipboardScript();
      } else {
        // Reload page to restore normal clipboard behavior
        window.location.reload();
      }
    }
  });

  // Log and alert for blocked clipboard attempts
  function logBlockedAttempt(action) {
    const site = location.hostname;
    const timestamp = new Date().toISOString();
    const key = `cw_log_${timestamp}`;
    const isBackground = document.visibilityState !== 'visible';

    // Early exit if extension context is invalid
    if (!chrome.runtime || !chrome.runtime.id) return;

    chrome.storage.local.get({ allowlist: [], alertCount: 0 }, (data) => {
      if (!chrome.runtime || !chrome.runtime.id) return;
      const allowlist = data.allowlist || [];
      if (allowlist.includes(site)) {
        return;
      }
      chrome.storage.local.set({
        [key]: { site, type: action, status: 'blocked', error: 'Blocked by user setting', timestamp, background: isBackground, legacy: true },
        alertCount: (data.alertCount || 0) + 1
      }, () => {
        if (!chrome.runtime || !chrome.runtime.id) return;
        try {
          if (typeof chrome.runtime.sendMessage === 'function') {
            chrome.runtime.sendMessage({ type: 'alertBadgeAndIcon' });
            chrome.runtime.sendMessage({ type: 'newAlert' });
            if (isBackground) {
              chrome.runtime.sendMessage({
                type: 'backgroundClipboardAccess',
                site,
                action: `BLOCKED clipboard ${action} request (by user setting)`,
                timestamp
              });
            }
          }
          console.log(`[Clipboard Watchdog] Blocked ${action} attempt from ${site} at ${timestamp}${isBackground ? ' [background]' : ''}`);
        } catch (e) {}
      });
      // Show a clear, non-confusing alert
      chrome.storage.local.get({ popupAlerts: true }, (data) => {
        if (data.popupAlerts !== false) {
          alert(`⚠️ Clipboard Watchdog: Blocked a clipboard ${action} request (by user setting).`);
        }
      });
    });
  }

  // Start the extension
  injectClipboardWatchdog();
  console.log('[Clipboard Watchdog] Content script loaded on', location.href);
} 