// Copyright (C) 2023-2024 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

const debug = false; // Set to true for debugging

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
  const shouldCloseDefault = predefinedUrlPatterns.some(({ pattern, label }) => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(url) && !disabledUrls.includes(pattern)) {
      if (debug) console.log(`Should close (default): true (matched: ${label})`);
      return true;
    }
    return false;
  });
  
  // Check custom URLs (exact literal match)
  const shouldCloseCustom = customUrls.some(({ url: customUrl, enabled }) => {
    if (enabled && url === customUrl) {
      if (debug) console.log(`Should close (custom): true (matched: ${customUrl})`);
      return true;
    }
    return false;
  });
  
  if (debug && !shouldCloseDefault && !shouldCloseCustom) {
    console.log(`URL does not match any closing patterns: ${url}`);
  }
  
  return shouldCloseDefault || shouldCloseCustom;
}

async function checkAndCloseTab(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    if (debug) console.log(`Tab updated: ${tab.url}`);
    const { interval = 15 } = await chrome.storage.sync.get(['interval']);
    
    if (await shouldCloseTab(tab.url)) {
      if (debug) console.log(`Scheduling tab for closure: ${tab.url}`);
      setTimeout(async () => {
        try {
          await chrome.tabs.remove(tabId);
          if (debug) console.log(`Closed tab: ${tab.url}`);
        } catch (error) {
          if (debug) console.error(`Error closing tab ${tab.url}: ${error.message}`);
        }
      }, interval * 1000);
    }
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(checkAndCloseTab);

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
