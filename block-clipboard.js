// Aggressive clipboard blocking script for Clipboard Watchdog
// Blocks all JavaScript clipboard access and notifies the extension when blocking occurs.

(function() {
  function warnBlock(type) {
    window.postMessage({ source: 'clipboard-watchdog', type: 'block', action: type }, '*');
  }
  if (window.navigator && window.navigator.clipboard) {
    try {
      window.navigator.clipboard.readText = function() {
        warnBlock('read');
        return Promise.reject(new Error('Clipboard access blocked by Clipboard Watchdog.'));
      };
      window.navigator.clipboard.writeText = function() {
        warnBlock('write');
        return Promise.reject(new Error('Clipboard access blocked by Clipboard Watchdog.'));
      };
    } catch (e) {}
  }
  try {
    document.execCommand = function(cmd) {
      cmd = String(cmd).toLowerCase();
      if (cmd === 'copy' || cmd === 'cut' || cmd === 'paste') {
        warnBlock(cmd);
        return false;
      }
      return false;
    };
  } catch (e) {}
})(); 