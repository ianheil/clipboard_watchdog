// Background script for Clipboard Watchdog
// Handles badge updates, alert icon, and notification logic for clipboard events.

console.log('Clipboard Watchdog background script active.');

// Icon sets for normal and alert states
const defaultIcons = {
  16: 'icons/icon16.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png'
};
const alertIcons = {
  16: 'icons/alert16.png',
  48: 'icons/alert48.png',
  128: 'icons/alert128.png'
};

let isAlertIcon = false;

// Ensure badgeCounter is set to true by default on extension load
chrome.storage.local.get({ badgeCounter: undefined }, (data) => {
  if (typeof data.badgeCounter === 'undefined') {
    chrome.storage.local.set({ badgeCounter: true });
  }
});

// Update the badge based on unseen alerts and user settings
function updateBadgeFromStorage() {
  chrome.storage.local.get({ badgeCounter: true, unseenAlertCount: 0 }, (data) => {
    if ((typeof data.badgeCounter === 'undefined' || data.badgeCounter !== false) && data.unseenAlertCount > 0) {
      chrome.action.setBadgeText({ text: String(data.unseenAlertCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#ff0033' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}
updateBadgeFromStorage();

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Show alert icon and badge for new alerts
  if (message && message.type === 'alertBadgeAndIcon') {
    chrome.action.setIcon({ path: alertIcons }, () => {
      setTimeout(() => {
        chrome.action.setIcon({ path: alertIcons }); // stays on alert icon
        isAlertIcon = true;
      }, 1000);
    });
  }
  // Show notification for background clipboard access
  if (message && message.type === 'backgroundClipboardAccess') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: alertIcons[48],
      title: 'Clipboard Watchdog: Background Access',
      message: `${message.site} tried to ${message.action} your clipboard in the background.\n${message.timestamp}`,
      priority: 2
    });
  }
  // Update badge when requested
  if (message && message.type === 'updateBadge') {
    updateBadgeFromStorage();
  }
  if (message && message.type === 'updateBadgeSetting') {
    updateBadgeFromStorage();
  }
  // Increment unseen and session alert counts for new alerts
  if (message && message.type === 'newAlert') {
    chrome.storage.local.get({ unseenAlertCount: 0, badgeCounter: true }, (localData) => {
      const unseen = (localData.unseenAlertCount || 0) + 1;
      chrome.storage.local.set({ unseenAlertCount: unseen }, () => {
        // Session count in session storage if available, else local
        const sessionStore = chrome.storage.session || chrome.storage.local;
        sessionStore.get({ sessionAlertCount: 0 }, (sessionData) => {
          const session = (sessionData.sessionAlertCount || 0) + 1;
          sessionStore.set({ sessionAlertCount: session }, () => {
            updateBadgeFromStorage();
          });
        });
      });
    });
  }
});

// Listen for popup opening to reset icon and unseen count
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(() => {
      chrome.action.setIcon({ path: defaultIcons });
      isAlertIcon = false;
      // Reset unseenAlertCount when popup is opened and update badge
      chrome.storage.local.set({ unseenAlertCount: 0 }, updateBadgeFromStorage);
    });
  }
}); 