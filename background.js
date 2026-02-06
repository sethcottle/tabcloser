// Copyright (C) 2023-2026 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

// Cross-browser namespace: Chrome <144 uses chrome.*, Firefox and Chrome 144+ use browser.*
const api = typeof browser !== 'undefined' ? browser : chrome;

const debug = false; // Set to true for debugging

const predefinedUrlPatterns = [
  { label: 'Asana', pattern: '^https?://app\\.asana\\.com/-/desktop_app_link\\?.*' },
  { label: 'AWS IAM Access Auth Success', pattern: '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success.html' },
  { label: 'Discord Invites', pattern: '^https?://discord\\.com/invite/' },
  { label: 'Figma Design Files', pattern: '^https?://(?:www\.)?figma\.com/design/' },
  { label: 'Figjam Files', pattern: '^https?://(?:www\.)?figma\.com/board/' },
  { label: 'Figma Slide Files', pattern: '^https?://(?:www\.)?figma\.com/slides/' },
  { label: 'Linear', pattern: '^https?://linear\\.app/(?!integrations(/|$)|settings(/|$)).*\\?noRedirect=1$' },
  { label: 'Microsoft Teams', pattern: '^https?://teams\\.microsoft\\.com/dl/launcher/.*' },
  { label: 'Notion', pattern: '^https?://www\\.notion\\.so/native/.*&deepLinkOpenNewTab=true' },
  { label: 'Slack', pattern: '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|.*\\/(customize|account|apps|marketplace)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.(enterprise\\.)?slack\\.com/(?:.*|ssb/signin_redirect\\?.*$)' },
  { label: 'Spotify', pattern: '^https?://open\\.spotify\\.com' },
  { label: 'VS Code Live Share', pattern: '^https?://vscode\\.dev/liveshare' },
  { label: 'Webex Joins', pattern: '^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice' },
  { label: 'Zoom Joins', pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/[js]/[^/]+.*#success$' },
];

async function shouldCloseTab(url) {
  const { disabledUrls = [], customUrls = [] } = await api.storage.sync.get(['disabledUrls', 'customUrls']);
  
  // Check predefined patterns
  const shouldCloseDefault = predefinedUrlPatterns.some(({ pattern, label }) => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(url) && !disabledUrls.includes(pattern)) {
      if (debug) console.log(`Should close (default): true (matched: ${label})`);
      return true;
    }
    return false;
  });
  
  // Enhanced custom URL checking with regex support
  const shouldCloseCustom = customUrls.some(({ url: customUrl, enabled, isRegex = false }) => {
    if (!enabled) return false;
    
    try {
      if (isRegex) {
        // Treat as regular expression
        const regex = new RegExp(customUrl, 'i');
        if (regex.test(url)) {
          if (debug) console.log(`Should close (custom regex): true (matched: ${customUrl})`);
          return true;
        }
      } else {
        // Exact match (existing behavior)
        if (url === customUrl) {
          if (debug) console.log(`Should close (custom exact): true (matched: ${customUrl})`);
          return true;
        }
      }
    } catch (error) {
      // Invalid regex pattern - log error but don't crash
      if (debug) console.error(`Invalid regex pattern "${customUrl}":`, error);
      return false;
    }
    
    return false;
  });
  
  if (debug && !shouldCloseDefault && !shouldCloseCustom) {
    console.log(`URL does not match any closing patterns: ${url}`);
  }
  
  return shouldCloseDefault || shouldCloseCustom;
}

// Track tabs that already have a close scheduled to avoid duplicates
const pendingClose = new Set();

async function scheduleClose(tabId, url) {
  // Don't schedule if already pending or if URL is empty/blank
  if (pendingClose.has(tabId) || !url || url === 'about:blank' || url === 'about:newtab') return;

  if (await shouldCloseTab(url)) {
    pendingClose.add(tabId);
    if (debug) console.log(`Scheduling tab for closure: ${url}`);
    const { interval = 15 } = await api.storage.sync.get(['interval']);

    setTimeout(async () => {
      try {
        await api.tabs.remove(tabId);
        if (debug) console.log(`Closed tab: ${url}`);
      } catch (error) {
        if (debug) console.error(`Error closing tab ${url}: ${error.message}`);
      } finally {
        pendingClose.delete(tabId);
      }
    }, interval * 1000);
  }
}

// Listen for tab updates — trigger on both status complete and URL changes
api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    const url = changeInfo.url || tab.url;
    if (debug) console.log(`Tab updated (${changeInfo.status || 'url change'}): ${url}`);
    scheduleClose(tabId, url);
  }
});

// Listen for new tabs — catches externally-opened tabs (Safari, OAuth flows, etc.)
api.tabs.onCreated.addListener((tab) => {
  if (tab.url && tab.url !== 'about:blank' && tab.url !== 'about:newtab') {
    if (debug) console.log(`Tab created with URL: ${tab.url}`);
    scheduleClose(tab.id, tab.url);
  }
});

// Clean up tracking when tabs are closed by the user or other means
api.tabs.onRemoved.addListener((tabId) => {
  pendingClose.delete(tabId);
});

// Service Worker initialization
api.runtime.onInstalled.addListener(() => {
  if (debug) console.log('TabCloser installed');
});

// Debug logging for storage changes
if (debug) {
  api.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      console.log('Storage changes:', changes);
    }
  });
}