const DEBUG = false;

function debugLog(message) {
  if (DEBUG) {
    console.log(message);
  }
}

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
        const matches = regex.test(url);
        debugLog(`Testing URL ${url} against pattern ${pattern}: ${matches}`);
        return matches && !disabledUrls.includes(pattern);
      });
      resolve(shouldClose);
    });
  });
}

async function checkTab(tab) {
  debugLog(`Checking tab with ID ${tab.id} and URL ${tab.url}`);
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
      debugLog(`Tab with ID ${tab.id} and URL ${tab.url} closed`);
    } catch (error) {
      console.error(`Error closing tab with id ${tab.id}:`, error.message);
    }
  } else {
    debugLog(`Tab with ID ${tab.id} and URL ${tab.url} not closed`);
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
  debugLog(`Using check interval: ${interval} seconds`);
  chrome.tabs.query({}, (tabs) => processTabs(tabs, 0, interval));
});

let checkInterval;

function processTabs(tabs, index) {
  if (index >= tabs.length) {
    console.log('All tabs processed. Waiting for the next interval:', checkInterval); // Added debug log
    setTimeout(() => {
      chrome.tabs.query({}, (tabs) => processTabs(tabs, 0));
    }, checkInterval * 1000);
    return;
  }

  const tab = tabs[index];
  console.log('Checking tab:', tab.url); // Added debug log
  checkTab(tab);
  processTabs(tabs, index + 1);
}

chrome.storage.sync.get(['interval'], ({ interval }) => {
  checkInterval = interval || 30;
  console.log('Initial check interval:', checkInterval); // Added debug log
  chrome.tabs.query({}, (tabs) => processTabs(tabs, 0));
});

// Add this event listener to listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.interval) {
    checkInterval = changes.interval.newValue;
    console.log('Check interval updated:', checkInterval); // Added debug log
  } else {
    console.log('No change in check interval detected'); // Added debug log
  }
});

