
function shouldTriggerPopup(url) {
  return url && !url.includes("meet.google.com") && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://");
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (shouldTriggerPopup(tab.url)) {
      chrome.runtime.sendMessage({ action: 'triggerPopup' });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'triggerPopup') {
    chrome.storage.local.get(["popup_count"], (result) => {
      const count = (result.popup_count || 0) + 1;
      chrome.storage.local.set({ "popup_count": count });

      // Trigger the popup in the browser
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: () => {
          const popup = document.createElement('div');
          popup.id = 'meet-monitor-popup';
          popup.innerHTML = 'You are leaving Google Meet!';
          document.body.appendChild(popup);
        }
      });
    });
  }
});


chrome.runtime.onInstalled.addListener(function() {
    chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 400,
        height: 600
    });
});

chrome.runtime.onStartup.addListener(function() {
    chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 400,
        height: 600
    });
});
