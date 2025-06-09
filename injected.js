// Injected script for Clipboard Watchdog
// Runs in the page context to monitor clipboard and network activity, and posts events to the extension.

// Track recent clipboard reads for exfiltration detection
let lastClipboardRead = 0;

// Patch navigator.clipboard.readText and writeText to monitor clipboard access
if (navigator && navigator.clipboard && typeof navigator.clipboard.readText === 'function' && typeof navigator.clipboard.writeText === 'function') {
  const originalReadText = navigator.clipboard.readText;
  const originalWriteText = navigator.clipboard.writeText;
  navigator.clipboard.readText = function() {
    const p = originalReadText.apply(this, arguments);
    p.then(
      result => {
        lastClipboardRead = Date.now();
        window.postMessage({ source: 'clipboard-watchdog', type: 'read', status: 'allowed', result }, '*');
      },
      error => {
        window.postMessage({ source: 'clipboard-watchdog', type: 'read', status: 'denied', error: error && error.message }, '*');
      }
    );
    return p;
  };
  navigator.clipboard.writeText = function() {
    const p = originalWriteText.apply(this, arguments);
    p.then(
      () => {
        window.postMessage({ source: 'clipboard-watchdog', type: 'write', status: 'allowed' }, '*');
      },
      error => {
        window.postMessage({ source: 'clipboard-watchdog', type: 'write', status: 'denied', error: error && error.message }, '*');
      }
    );
    return p;
  };
}

// Patch document.execCommand to monitor legacy clipboard actions
if (document && typeof document.execCommand === 'function') {
  const originalExecCommand = document.execCommand;
  document.execCommand = function(commandId, ...args) {
    const cmd = String(commandId).toLowerCase();
    if (cmd === 'copy' || cmd === 'cut' || cmd === 'paste') {
      window.postMessage({ source: 'clipboard-watchdog', type: 'execCommand', command: cmd }, '*');
    }
    return originalExecCommand.apply(this, arguments);
  };
}

// Patch fetch and XHR to detect exfiltration after clipboard read
const origFetch = window.fetch;
window.fetch = function() {
  if (lastClipboardRead && Date.now() - lastClipboardRead < 2000) {
    window.postMessage({ source: 'clipboard-watchdog', type: 'exfiltration', method: 'fetch', timestamp: new Date().toISOString() }, '*');
  }
  return origFetch.apply(this, arguments);
};
const origXHR = window.XMLHttpRequest;
function XHRProxy() {
  const xhr = new origXHR();
  xhr.addEventListener('readystatechange', function() {
    if (xhr.readyState === 1 && lastClipboardRead && Date.now() - lastClipboardRead < 2000) {
      window.postMessage({ source: 'clipboard-watchdog', type: 'exfiltration', method: 'xhr', timestamp: new Date().toISOString() }, '*');
    }
  });
  return xhr;
}
window.XMLHttpRequest = XHRProxy; 