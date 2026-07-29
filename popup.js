// Copyright (C) 2023-2026 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

// Quick controls: global pause/snooze and the recently-closed list. Full
// configuration lives on the options page.

// Cross-browser namespace: Chrome <144 uses chrome.*, Firefox and Chrome 144+ use browser.*
const api = typeof browser !== 'undefined' ? browser : chrome;

const SNOOZE_MINUTES = 15;

function timeAgo(timestamp) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr${hours === 1 ? '' : 's'} ago`;
}

async function renderStatus() {
  const { paused = false, snoozeUntil = 0 } = await api.storage.local.get(['paused', 'snoozeUntil']);
  const snoozed = !paused && snoozeUntil > Date.now();
  const active = !paused && !snoozed;

  const toggle = document.getElementById('active-toggle');
  toggle.checked = active;
  toggle.setAttribute('aria-checked', String(active));

  const title = document.getElementById('status-title');
  const detail = document.getElementById('status-detail');
  const snoozeBtn = document.getElementById('snooze-btn');

  if (paused) {
    title.textContent = 'Paused';
    detail.textContent = 'No tabs will be closed';
    snoozeBtn.textContent = `Pause for ${SNOOZE_MINUTES} minutes`;
  } else if (snoozed) {
    const until = new Date(snoozeUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    title.textContent = 'Snoozed';
    detail.textContent = `Resumes at ${until}`;
    snoozeBtn.textContent = 'Resume now';
  } else {
    title.textContent = 'Active';
    detail.textContent = 'Watching for leftover tabs';
    snoozeBtn.textContent = `Pause for ${SNOOZE_MINUTES} minutes`;
  }
}

async function renderRecentlyClosed() {
  const { recentlyClosed = [] } = await api.storage.session.get(['recentlyClosed']);
  const list = document.getElementById('recently-closed');
  list.innerHTML = '';

  document.getElementById('clear-closed').hidden = recentlyClosed.length === 0;

  if (recentlyClosed.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = 'No tabs closed this session';
    list.appendChild(li);
    return;
  }

  recentlyClosed.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'closed-item';

    const info = document.createElement('span');
    info.className = 'closed-info';

    const urlSpan = document.createElement('span');
    urlSpan.className = 'closed-url';
    urlSpan.textContent = entry.url;
    urlSpan.title = entry.url;

    const meta = document.createElement('span');
    meta.className = 'closed-meta';
    meta.textContent = `${entry.label} · ${timeAgo(entry.closedAt)}`;

    info.appendChild(urlSpan);
    info.appendChild(meta);

    const reopenBtn = document.createElement('button');
    reopenBtn.className = 'reopen-btn';
    reopenBtn.textContent = 'Reopen';
    reopenBtn.setAttribute('aria-label', `Reopen ${entry.url}`);
    reopenBtn.addEventListener('click', () => reopenTab(entry));

    li.appendChild(info);
    li.appendChild(reopenBtn);
    list.appendChild(li);
  });
}

async function reopenTab(entry) {
  await api.tabs.create({ url: entry.url, active: true });
  const { recentlyClosed = [] } = await api.storage.session.get(['recentlyClosed']);
  const remaining = recentlyClosed.filter(
    (item) => !(item.url === entry.url && item.closedAt === entry.closedAt)
  );
  await api.storage.session.set({ recentlyClosed: remaining });
  renderRecentlyClosed();
}

async function onActiveToggle(event) {
  // Enabling also clears any snooze; disabling is a hard pause until re-enabled
  await api.storage.local.set({ paused: !event.target.checked, snoozeUntil: 0 });
  renderStatus();
}

async function onSnooze() {
  const { snoozeUntil = 0 } = await api.storage.local.get(['snoozeUntil']);
  if (snoozeUntil > Date.now()) {
    // Button doubles as "Resume now" while snoozed
    await api.storage.local.set({ snoozeUntil: 0, paused: false });
  } else {
    await api.storage.local.set({ snoozeUntil: Date.now() + SNOOZE_MINUTES * 60 * 1000, paused: false });
  }
  renderStatus();
}

// Summary line on the settings link: how many default services are on and how
// many custom rules exist. predefinedUrlPatterns comes from patterns.js.
async function renderManageSummary() {
  const { disabledUrls = [], customUrls = [] } = await api.storage.sync.get(['disabledUrls', 'customUrls']);
  const total = predefinedUrlPatterns.length;
  const known = new Set(predefinedUrlPatterns.map((p) => p.pattern));
  const disabledCount = disabledUrls.filter((pattern) => known.has(pattern)).length;
  const customPart = customUrls.length === 0
    ? 'no custom rules'
    : `${customUrls.length} custom rule${customUrls.length === 1 ? '' : 's'}`;
  document.getElementById('manage-detail').textContent =
    `${total - disabledCount}/${total} default services on · ${customPart}`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderStatus();
  renderRecentlyClosed();
  renderManageSummary();

  document.getElementById('active-toggle').addEventListener('change', onActiveToggle);
  document.getElementById('snooze-btn').addEventListener('click', onSnooze);
  document.getElementById('clear-closed').addEventListener('click', async () => {
    await api.storage.session.set({ recentlyClosed: [] });
    renderRecentlyClosed();
  });
  document.getElementById('open-settings').addEventListener('click', (event) => {
    event.preventDefault();
    api.runtime.openOptionsPage();
    window.close();
  });

  const versionLink = document.getElementById('version-link');
  versionLink.textContent = `v${api.runtime.getManifest().version}`;
});
