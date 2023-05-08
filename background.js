const predefinedUrlPatterns = [
  {
    label: ' Zoom Joins',
    pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/j/[^/]+#success$',
  },
  {
    label: ' Figma Files',
    pattern: '^https?://(?:www\.)?figma\.com/file/',
  },
  {
    label: ' Spotify',
    pattern: '^https?://open\\.spotify\\.com',
  },
  {
    label: ' Discord Invites',
    pattern: '^https?://discord\\.com/invite/',
  },
  {
    label: ' VS Code Live Share',
    pattern: '^https?://vscode\\.dev/liveshare',
  },
];

function shouldCloseTab(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['disabledUrls'], ({ disabledUrls }) => {
      if (!disabledUrls) {
        disabledUrls = [];
      }
      const shouldClose = predefinedUrlPatterns.some(({ pattern }) => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(url) && !disabledUrls.includes(pattern);
      });
      resolve(shouldClose);
    });
  });
}

async function checkTab(tab) {
  const shouldClose = await shouldCloseTab(tab.url);
  if (shouldClose) {
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.remove(tab.id, () => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      console.log(`Error closing tab with id ${tab.id}:`, error.message);
    }
  }
}

function processTabs(tabs, index, interval) {
  if (index >= tabs.length) {
    setTimeout(() => {
      chrome.tabs.query({}, (tabs) => processTabs(tabs, 0, interval));
    }, interval * 1000);
    return;
  }

  const tab = tabs[index];
  checkTab(tab);
  processTabs(tabs, index + 1, interval);
}

chrome.storage.sync.get(['interval'], ({ interval }) => {
  interval = interval || 30;
  chrome.tabs.query({}, (tabs) => processTabs(tabs, 0, interval));
});
