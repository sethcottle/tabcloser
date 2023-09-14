// Copyright (C) 2023 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details. 

const debug = false;

const predefinedUrlPatterns = [
  {
    label: ' Asana',
    pattern: '^https?://app\\.asana\\.com/-/desktop_app_link\\?.*',
  },
  {
    label: ' Discord Invites',
    pattern: '^https?://discord\\.com/invite/',
  },
  {
    label: ' Figma Files',
    pattern: '^https?://(?:www\.)?figma\.com/file/',
  },
  {
    label: ' Linear',
    pattern: '^https?://linear\\.app/.*\\?noRedirect=1$',
  },
  {
    label: ' Microsoft Teams',
    pattern: '^https?://teams\\.microsoft\\.com/dl/launcher/.*',
  }
  {
    label: ' Notion',
    pattern: '^https?://www\\.notion\\.so/native/.*&deepLinkOpenNewTab=true',
  },
  {
    label: ' Slack',
    pattern: '^https?://[a-z0-9-]+\\.slack\\.com/.*$',
  },
  {
    label: ' Spotify',
    pattern: '^https?://open\\.spotify\\.com',
  },
  {
    label: ' VS Code Live Share',
    pattern: '^https?://vscode\\.dev/liveshare',
  },
  {
    label: ' Webex Joins',
    pattern: '^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice',
  },
  {
    label: ' Zoom Joins',
    pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/j/[^/]+#success$',
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

async function checkTab(tab, interval) {
  const shouldClose = await shouldCloseTab(tab.url);
  if (shouldClose) {
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          chrome.tabs.remove(tab.id, () => {
            const err = chrome.runtime.lastError;
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }, interval * 1000);
      });
    } catch (error) {
      console.log(`Error closing tab with id ${tab.id}:`, error.message);
    }
  }
}

function processTabs(tabs, index, interval) {
  if (index >= tabs.length) {
    return;
  }

  const tab = tabs[index];
  checkTab(tab, interval);
  processTabs(tabs, index + 1, interval);
}

function runTabCloser() {
  chrome.storage.sync.get(['interval'], ({ interval }) => {
    interval = interval || 15;
    if (debug) {
      console.log('TabCloser interval:', interval);
    }
    chrome.tabs.query({}, (tabs) => processTabs(tabs, 0, interval));
  });

  if (debug) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        for (const key in changes) {
          console.log(`Changed ${key}:`, changes[key]);
        }
      }
    });
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  setTimeout(runTabCloser, 5000);
});

runTabCloser();
