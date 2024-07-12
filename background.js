// Copyright (C) 2023-2024 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details. 

const debug = true; // Set to true for debugging

const predefinedUrlPatterns = [
  { label: 'Asana', pattern: '^https?://app\\.asana\\.com/-/desktop_app_link\\?.*' },
  { label: 'AWS IAM Access Auth Success', pattern: '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success.html' },
  { label: 'Discord Invites', pattern: '^https?://discord\\.com/invite/' },
  { label: 'Figma Design Files', pattern: '^https?://(?:www\.)?figma\.com/design/' },
  { label: 'Figjam Files', pattern: '^https?://(?:www\.)?figma\.com/board/' },
  { label: 'Figma Slide Files', pattern: '^https?://(?:www\.)?figma\.com/slides/' },
  { label: 'Linear', pattern: '^https?://linear\\.app/.*\\?noRedirect=1$' },
  { label: 'Microsoft Teams', pattern: '^https?://teams\\.microsoft\\.com/dl/launcher/.*' },
  { label: 'Notion', pattern: '^https?://www\\.notion\\.so/native/.*&deepLinkOpenNewTab=true' },
  { label: 'Slack', pattern: '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|.*\\/(customize|account|apps)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.slack\\.com/.*$' },
  { label: 'Spotify', pattern: '^https?://open\\.spotify\\.com' },
  { label: 'VS Code Live Share', pattern: '^https?://vscode\\.dev/liveshare' },
  { label: 'Webex Joins', pattern: '^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice' },
  { label: 'Zoom Joins', pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/j/[^/]+#success$' },
];

async function shouldCloseTab(url) {
  const { disabledUrls = [], customUrls = [] } = await chrome.storage.sync.get(['disabledUrls', 'customUrls']);
  
  // Check predefined patterns
  let matchedPattern = null;
  const shouldCloseDefault = predefinedUrlPatterns.some(({ pattern, label }) => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(url) && !disabledUrls.includes(pattern)) {
      matchedPattern = label;
      return true;
    }
    return false;
  });
  
  // Check custom URLs (exact literal match)
  const matchedCustomUrl = customUrls.find(({ url: customUrl, enabled }) => {
    if (!enabled) return false;
    return url === customUrl; // Exact, case-sensitive match
  });
  
  const shouldCloseCustom = !!matchedCustomUrl;
  
  if (debug) {
    console.log(`Checking URL: ${url}`);
    if (shouldCloseDefault) {
      console.log(`Should close (default): true (matched: ${matchedPattern})`);
    } else if (shouldCloseCustom) {
      console.log(`Should close (custom): true (matched: ${matchedCustomUrl.url})`);
    } else {
      console.log(`URL does not match any closing patterns`);
    }
  }
  
  return shouldCloseDefault || shouldCloseCustom;
}

async function checkAndCloseTabs() {
  const tabs = await chrome.tabs.query({});
  const { interval = 15 } = await chrome.storage.sync.get(['interval']);
  
  if (debug) {
    console.log(`Checking ${tabs.length} tabs`);
    console.log(`Closure interval: ${interval} seconds`);
  }
  
  for (const tab of tabs) {
    const shouldClose = await shouldCloseTab(tab.url);
    if (shouldClose) {
      if (debug) {
        console.log(`Attempting to close tab: ${tab.url}`);
      }
      try {
        await new Promise((resolve) => {
          setTimeout(async () => {
            try {
              // Check if the tab still exists before attempting to close it
              const tabExists = await chrome.tabs.get(tab.id).catch(() => null);
              if (tabExists) {
                await chrome.tabs.remove(tab.id);
                if (debug) {
                  console.log(`Successfully closed tab with id ${tab.id}`);
                }
              } else if (debug) {
                console.log(`Tab with id ${tab.id} no longer exists`);
              }
            } catch (error) {
              console.error(`Error closing tab with id ${tab.id}:`, error.message);
            }
            resolve();
          }, interval * 1000);
        });
      } catch (error) {
        console.error(`Unexpected error handling tab with id ${tab.id}:`, error.message);
      }
    }
  }
}

// Run tab closer periodically
chrome.alarms.create('runTabCloser', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'runTabCloser') {
    if (debug) {
      console.log('Running tab closer alarm');
    }
    checkAndCloseTabs();
  }
});

// Listen for new tab creation
chrome.tabs.onCreated.addListener(() => {
  if (debug) {
    console.log('New tab created, scheduling check');
  }
  setTimeout(() => checkAndCloseTabs(), 10000);
});

// Service Worker initialization
chrome.runtime.onInstalled.addListener(() => {
  if (debug) console.log('TabCloser installed');
});

// Debug logging for storage changes
if (debug) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      console.log('Storage changes:', changes);
    }
  });
}