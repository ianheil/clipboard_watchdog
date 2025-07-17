// Popup script for Clipboard Watchdog
// Handles UI logic for logs, allowlist, settings, and export features.

// Show the allowlist in the popup
function updateAllowlistUI(allowlist) {
  const list = document.getElementById("allowlist");
  list.innerHTML = "";
  for (const domain of allowlist) {
    const li = document.createElement("li");
    li.textContent = domain + ' ';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '\u00D7';
    removeBtn.title = 'Remove from allowlist';
    removeBtn.style.marginLeft = '8px';
    removeBtn.onclick = () => {
      chrome.storage.local.get({ allowlist: [] }, (data) => {
        const updatedList = (data.allowlist || []).filter(d => d !== domain);
        chrome.storage.local.set({ allowlist: updatedList }, () => {
          updateAllowlistUI(updatedList);
        });
      });
    };
    li.appendChild(removeBtn);
    list.appendChild(li);
  }
}

// Export logs as CSV or JSON
function exportLogs(entries, asJson) {
  if (!entries.length) return;
  if (asJson) {
    const data = entries.map(([_, value]) => value);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clipboard_watchdog_logs.json';
    a.click();
    return;
  }
  // CSV export with clear, matching columns
  const header = 'timestamp,site,action,result,error,detection\n';
  const rows = entries.map(([_, value]) => {
    // Ensure all fields are present and quoted if needed
    const detection = [
      value.legacy ? 'legacy' : '',
      value.background ? 'background' : '',
      value.noRecentGesture ? 'no-gesture' : '',
      value.overwriteLoopDetected ? 'overwrite-loop' : '',
      value.method ? value.method : ''
    ].filter(Boolean).join('|');
    function q(v) { return v ? '"' + String(v).replace(/"/g, '""') + '"' : ''; }
    return [
      q(formatTimestamp(value.timestamp)),
      q(value.site),
      q(value.type),
      q(value.status || ''),
      q(value.error || ''),
      q(detection)
    ].join(',');
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clipboard_watchdog_logs.csv';
  a.click();
}

// Format timestamps for display
function formatTimestamp(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// Show/hide modal dialogs
function showModal(id) {
  document.getElementById(id).style.display = 'flex';
}
function hideModal(id) {
  document.getElementById(id).style.display = 'none';
}
document.getElementById('helpBtn').onclick = () => showModal('helpModal');
document.getElementById('closeHelp').onclick = () => hideModal('helpModal');
document.getElementById('settingsBtn').onclick = () => showModal('settingsModal');
document.getElementById('closeSettings').onclick = () => hideModal('settingsModal');

// Update the settings UI based on stored values
function updateSettingsUI(settings) {
  document.getElementById('togglePopupAlerts').checked = settings.popupAlerts !== false;
  document.getElementById('toggleAutoClear').checked = settings.autoClearLogs !== false;
  document.getElementById('toggleBadgeCounter').checked = settings.badgeCounter !== false;
  document.getElementById('toggleExportJson').checked = settings.exportJson === true;
  document.getElementById('toggleBlockClipboard').checked = settings.blockClipboard === true;
  document.getElementById('toggleExtensionDisabled').checked = settings.extensionDisabled === true;
  document.getElementById('exportLogs').textContent = 'Export Logs';
}
// Save settings when toggles are changed
function saveSettings() {
  const popupAlerts = document.getElementById('togglePopupAlerts').checked;
  const autoClearLogs = document.getElementById('toggleAutoClear').checked;
  const badgeCounter = document.getElementById('toggleBadgeCounter').checked;
  const exportJson = document.getElementById('toggleExportJson').checked;
  const blockClipboard = document.getElementById('toggleBlockClipboard').checked;
  const extensionDisabled = document.getElementById('toggleExtensionDisabled').checked;
  chrome.storage.local.set({ popupAlerts, autoClearLogs, badgeCounter, exportJson, blockClipboard, extensionDisabled }, () => {
    chrome.runtime.sendMessage({ type: 'updateBadgeSetting' });
    document.getElementById('exportLogs').textContent = 'Export Logs';
  });
}
document.getElementById('togglePopupAlerts').onchange = saveSettings;
document.getElementById('toggleAutoClear').onchange = saveSettings;
document.getElementById('toggleBadgeCounter').onchange = saveSettings;
document.getElementById('toggleExportJson').onchange = saveSettings;
document.getElementById('toggleBlockClipboard').onchange = saveSettings;
document.getElementById('toggleExtensionDisabled').onchange = saveSettings;

// Load settings on popup open
chrome.storage.local.get({ popupAlerts: true, autoClearLogs: true, badgeCounter: true, blockClipboard: false, exportJson: false, extensionDisabled: false }, (settings) => {
  // Defensive: if blockClipboard is undefined, set it to false
  if (typeof settings.blockClipboard === 'undefined') {
    chrome.storage.local.set({ blockClipboard: false });
    settings.blockClipboard = false;
  }
  updateSettingsUI(settings);
});

// Remove logs older than 14 days if auto-clear is enabled
function autoClearOldLogs() {
  chrome.storage.local.get({ autoClearLogs: true }, (data) => {
    if (!data.autoClearLogs) return;
    chrome.storage.local.get(null, (items) => {
      const now = Date.now();
      const keysToRemove = Object.entries(items)
        .filter(([k, v]) => k.startsWith('cw_log_') && v.timestamp && (now - new Date(v.timestamp).getTime() > 14 * 24 * 60 * 60 * 1000))
        .map(([k]) => k);
      if (keysToRemove.length) {
        chrome.storage.local.remove(keysToRemove);
      }
    });
  });
}
autoClearOldLogs();

// Main popup logic: load logs, allowlist, and set up event handlers

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(null, (items) => {
    const log = document.getElementById("log");
    const counter = document.getElementById("counter");
    const unseen = items.unseenAlertCount || 0;
    // Get session count from session storage if available, else local
    const getSessionCount = (cb) => {
      const sessionStore = chrome.storage.session || chrome.storage.local;
      sessionStore.get({ sessionAlertCount: 0 }, (sessionData) => {
        cb(sessionData.sessionAlertCount || 0);
      });
    };
    getSessionCount(session => {
      counter.innerHTML = `<span style='color:#ff0033;font-weight:bold;'>${unseen}</span> unseen, <span style='color:#00ff99;'>${session}</span> this session`;
    });

    const entries = Object.entries(items).filter(([key]) => key.startsWith("cw_log_"));
    entries.sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp));

    for (const [key, value] of entries.slice(0, 10)) {
      const li = document.createElement("li");
      li.textContent = `${formatTimestamp(value.timestamp)} \u2013 ${value.site} (${value.type})`;
      log.appendChild(li);
    }

    updateAllowlistUI(items.allowlist || []);

    chrome.storage.local.get({ exportJson: false }, (settings) => {
      document.getElementById("exportLogs").onclick = () => exportLogs(entries, settings.exportJson);
    });
  });

  document.getElementById("addDomain").addEventListener("click", () => {
    const domain = document.getElementById("domainInput").value.trim();
    if (!domain) return;

    chrome.storage.local.get({ allowlist: [] }, (data) => {
      const updatedList = [...new Set([...data.allowlist, domain])];
      chrome.storage.local.set({ allowlist: updatedList }, () => {
        updateAllowlistUI(updatedList);
        document.getElementById("domainInput").value = "";
      });
    });
  });

  document.getElementById("clearLogs").addEventListener("click", () => {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(k => k.startsWith("cw_log_"));
      chrome.storage.local.remove(keysToRemove, () => {
        // Refresh log UI
        const log = document.getElementById("log");
        log.innerHTML = "";
      });
    });
  });

  // Connect to background to signal popup open/close
  const port = chrome.runtime.connect({ name: 'popup' });

  // Set version number
  chrome.runtime.getManifest && (document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version);
}); 