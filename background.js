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

// Chrome and Safari run this file as a service worker, so the shared pattern
// list is pulled in with importScripts. Firefox runs it as an event page where
// importScripts doesn't exist — there patterns.js is loaded first via the
// manifest's background.scripts array, so the guard below is already satisfied.
if (typeof predefinedUrlPatterns === 'undefined' && typeof importScripts === 'function') {
  importScripts('patterns.js');
}

const SWEEP_ALARM = 'tabcloser-sweep';
const RECENT_CLOSED_LIMIT = 20;

async function migrateDisabledUrls() {
  try {
    const { disabledUrls = [] } = await api.storage.sync.get(['disabledUrls']);
    const migrated = disabledUrls.map((pattern) => legacyPatternMap[pattern] || pattern);
    if (migrated.some((pattern, i) => pattern !== disabledUrls[i])) {
      await api.storage.sync.set({ disabledUrls: [...new Set(migrated)] });
      if (debug) console.log('Migrated stored disabled patterns to current forms');
    }
  } catch (error) {
    if (debug) console.error(`Pattern migration failed: ${error.message}`);
  }
}

// Global pause: a manual on/off switch plus a timed snooze, both set from the
// popup. Stored in storage.local — pausing one machine shouldn't pause others.
async function isPaused() {
  const { paused = false, snoozeUntil = 0 } = await api.storage.local.get(['paused', 'snoozeUntil']);
  return paused || snoozeUntil > Date.now();
}

// Returns the label of the rule that matches this URL, or null if none does
async function matchClosePattern(url) {
  const { disabledUrls = [], customUrls = [] } = await api.storage.sync.get(['disabledUrls', 'customUrls']);

  // Check predefined patterns
  for (const { pattern, label } of predefinedUrlPatterns) {
    if (disabledUrls.includes(pattern)) continue;
    if (new RegExp(pattern, 'i').test(url)) {
      if (debug) console.log(`Should close (default): true (matched: ${label})`);
      return label;
    }
  }

  // Custom URL checking with regex support
  for (const { url: customUrl, enabled, isRegex = false } of customUrls) {
    if (!enabled) continue;

    try {
      if (isRegex) {
        if (new RegExp(customUrl, 'i').test(url)) {
          if (debug) console.log(`Should close (custom regex): true (matched: ${customUrl})`);
          return 'Custom URL';
        }
      } else if (url === customUrl) {
        if (debug) console.log(`Should close (custom exact): true (matched: ${customUrl})`);
        return 'Custom URL';
      }
    } catch (error) {
      // Invalid regex pattern - log error but don't crash
      if (debug) console.error(`Invalid regex pattern "${customUrl}":`, error);
    }
  }

  if (debug) console.log(`URL does not match any closing patterns: ${url}`);
  return null;
}

// Log closes so the popup can show "recently closed" with an undo button.
// storage.session keeps the log scoped to the current browser session.
async function recordClose(url, label) {
  try {
    const { recentlyClosed = [] } = await api.storage.session.get(['recentlyClosed']);
    recentlyClosed.unshift({ url, label, closedAt: Date.now() });
    await api.storage.session.set({ recentlyClosed: recentlyClosed.slice(0, RECENT_CLOSED_LIMIT) });
  } catch (error) {
    if (debug) console.error(`Could not record close: ${error.message}`);
  }
}

// Scheduled closes live in two places:
//   - timers: in-memory setTimeout handles — the fast path, lost whenever the
//     background worker is suspended
//   - storage.session pendingCloses ({ tabId: { url, deadline } }): survives
//     suspension; restorePendingCloses() re-arms timers from it on wake, and
//     the sweep alarm closes anything whose timer died
// storage.session is scoped to the browser session, so stale schedules don't
// outlive a browser restart.
const timers = new Map();

async function getPendingCloses() {
  const { pendingCloses = {} } = await api.storage.session.get(['pendingCloses']);
  return pendingCloses;
}

async function removePendingClose(tabId) {
  const timer = timers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(tabId);
  }
  const pendingCloses = await getPendingCloses();
  if (tabId in pendingCloses) {
    delete pendingCloses[tabId];
    await api.storage.session.set({ pendingCloses });
  }
  updateBadge();
}

// Re-verify the URL before closing: the tab may have navigated to a
// non-matching URL without firing any event we can see (Safari doesn't emit
// tabs.onUpdated for in-page History API navigations)
async function closeIfStillMatching(tabId) {
  let tab;
  try {
    tab = await api.tabs.get(tabId);
  } catch (error) {
    // Tab is already gone
    await removePendingClose(tabId);
    return;
  }

  try {
    const label = !(await isPaused()) && tab.url ? await matchClosePattern(tab.url) : null;
    if (label) {
      await api.tabs.remove(tabId);
      await recordClose(tab.url, label);
      if (debug) console.log(`Closed tab: ${tab.url}`);
    } else if (debug) {
      console.log(`Skipped close — paused or tab navigated to: ${tab.url}`);
    }
  } catch (error) {
    if (debug) console.error(`Error closing tab ${tabId}: ${error.message}`);
  } finally {
    await removePendingClose(tabId);
  }
}

function armTimer(tabId, delayMs) {
  if (timers.has(tabId)) return;
  timers.set(tabId, setTimeout(() => closeIfStillMatching(tabId), Math.max(0, delayMs)));
}

async function scheduleClose(tabId, url) {
  if (!url || url === 'about:blank' || url === 'about:newtab') return;
  if (await isPaused()) return;

  const pendingCloses = await getPendingCloses();

  if (await matchClosePattern(url)) {
    // Already scheduled for this tab — skip duplicate
    if (tabId in pendingCloses) {
      // Worker may have restarted since scheduling; make sure a timer is armed
      armTimer(tabId, pendingCloses[tabId].deadline - Date.now());
      return;
    }

    if (debug) console.log(`Scheduling tab for closure: ${url}`);
    const { interval = 15 } = await api.storage.sync.get(['interval']);
    const deadline = Date.now() + interval * 1000;

    pendingCloses[tabId] = { url, deadline };
    await api.storage.session.set({ pendingCloses });
    armTimer(tabId, interval * 1000);
    updateBadge();
  } else if (tabId in pendingCloses) {
    // URL changed to something that shouldn't close — cancel the pending closure
    await removePendingClose(tabId);
    if (debug) console.log(`Cancelled pending close — tab navigated to: ${url}`);
  }
}

// Re-arm timers for schedules that survived a worker suspension; close anything
// already past its deadline (after re-verifying its URL)
async function restorePendingCloses() {
  const pendingCloses = await getPendingCloses();
  for (const [tabId, { deadline }] of Object.entries(pendingCloses)) {
    armTimer(Number(tabId), deadline - Date.now());
  }
  updateBadge();
}

// Periodic safety net, on an alarm so it wakes the worker:
//   - closes scheduled tabs whose timer died with a suspended worker
//   - scans all tabs for matches that never produced an event — Safari doesn't
//     fire tabs.onUpdated for in-page History API navigations (e.g. Linear's
//     client-side redirect to ...?noRedirect=1), so this is what catches them
async function sweep() {
  if (await isPaused()) {
    updateBadge();
    return;
  }

  await restorePendingCloses();

  const pendingCloses = await getPendingCloses();
  let tabs = [];
  try {
    tabs = await api.tabs.query({});
  } catch (error) {
    if (debug) console.error(`Sweep tab query failed: ${error.message}`);
    return;
  }
  for (const tab of tabs) {
    const url = tab.url || tab.pendingUrl;
    if (tab.id != null && !(tab.id in pendingCloses)) {
      await scheduleClose(tab.id, url);
    }
  }
}

// Toolbar badge: countdown to the next scheduled close, or a pause marker.
// Ticks only while the worker is awake — after a suspension the next event or
// sweep refreshes it, and the badge text itself persists either way.
let badgeTicker = null;

function stopBadgeTicker() {
  if (badgeTicker) {
    clearInterval(badgeTicker);
    badgeTicker = null;
  }
}

async function updateBadge() {
  if (!api.action || !api.action.setBadgeText) return;
  try {
    if (await isPaused()) {
      stopBadgeTicker();
      await api.action.setBadgeText({ text: '||' });
      return;
    }
    const pendingCloses = await getPendingCloses();
    const deadlines = Object.values(pendingCloses).map((p) => p.deadline);
    if (deadlines.length === 0) {
      stopBadgeTicker();
      await api.action.setBadgeText({ text: '' });
      return;
    }
    const seconds = Math.max(0, Math.ceil((Math.min(...deadlines) - Date.now()) / 1000));
    await api.action.setBadgeText({ text: String(seconds) });
    if (!badgeTicker) {
      badgeTicker = setInterval(updateBadge, 1000);
    }
  } catch (error) {
    if (debug) console.error(`Badge update failed: ${error.message}`);
  }
}

// React to pause/resume from the popup: cancel schedules when pausing, rescan
// immediately when resuming
async function handlePauseChange() {
  if (await isPaused()) {
    const pendingCloses = await getPendingCloses();
    for (const tabId of Object.keys(pendingCloses)) {
      await removePendingClose(Number(tabId));
    }
  } else {
    sweep();
  }
  updateBadge();
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
// Chrome often exposes the target URL only as pendingUrl at creation time
api.tabs.onCreated.addListener((tab) => {
  const url = tab.url || tab.pendingUrl;
  if (url && url !== 'about:blank' && url !== 'about:newtab') {
    if (debug) console.log(`Tab created with URL: ${url}`);
    scheduleClose(tab.id, url);
  }
});

// Clean up tracking when tabs are closed by the user or other means
api.tabs.onRemoved.addListener((tabId) => {
  removePendingClose(tabId);
});

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SWEEP_ALARM) sweep();
});

api.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && ('paused' in changes || 'snoozeUntil' in changes)) {
    handlePauseChange();
  }
  if (debug && areaName === 'sync') {
    console.log('Storage changes:', changes);
  }
});

// Open welcome page on first install; set uninstall survey URL
api.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    api.tabs.create({ url: 'https://tinyextensions.com/tabcloser-howto' });
  }
  // Pattern edits ship with updates, so this is the right moment to rewrite
  // any stored old-form patterns (no-op when nothing matches)
  migrateDisabledUrls();
  if (debug) console.log('TabCloser installed');
});

// Not implemented by every browser (Safari) — guard so an undefined API can't
// kill the whole background script at evaluation time
if (api.runtime.setUninstallURL) {
  api.runtime.setUninstallURL('https://tinyextensions.com/uninstall.html?ext=tabcloser');
}
if (api.action && api.action.setBadgeBackgroundColor) {
  api.action.setBadgeBackgroundColor({ color: '#2F55D4' });
}

// Runs on every worker start (install, browser start, wake from suspension):
// keep the sweep alarm alive and re-arm any surviving schedules
api.alarms.create(SWEEP_ALARM, { periodInMinutes: 1 });
restorePendingCloses();
