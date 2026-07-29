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
// All storage calls here use promises (await), never callbacks — Firefox's
// browser.* namespace is promise-only, and promises work on every target.
const api = typeof browser !== 'undefined' ? browser : chrome;

const debug = false; // Set to true when you need to debug

// predefinedUrlPatterns and legacyPatternMap come from patterns.js, loaded
// before this script by options.html

// Inline SVG glyphs — emoji render differently per OS and read as unfinished
const SVG_CHEVRON = '<svg class="chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_CODE = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_TRASH = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 4.5h11M6.5 4.5v-2h3v2M4.5 4.5l.6 9h5.8l.6-9M6.7 7v4M9.3 7v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Non-blocking feedback instead of alert()
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  const lifetime = type === 'error' ? 6000 : 3000;
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, lifetime);
}

// storage.sync writes can fail (quota, sync backend errors) — surface that
// instead of silently dropping the user's change
async function saveSync(items) {
  try {
    await api.storage.sync.set(items);
    return true;
  } catch (error) {
    showToast(`Couldn't save your settings: ${error.message}`, 'error');
    return false;
  }
}

async function saveOptions() {
  const disabledUrls = [];
  document.querySelectorAll('#default-options input[data-pattern]').forEach((checkbox) => {
    if (!checkbox.checked) {
      disabledUrls.push(checkbox.dataset.pattern);
    }
  });
  if (await saveSync({ disabledUrls })) {
    if (debug) console.log('Options saved. Disabled URLs:', disabledUrls);
  }
}

// Expandable read-only view of the regex behind a service, with a copy button
function buildPatternReveal(pattern) {
  const reveal = document.createElement('div');
  reveal.className = 'pattern-reveal';
  reveal.hidden = true;

  const code = document.createElement('code');
  code.textContent = pattern;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-pattern-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pattern);
      showToast('Pattern copied to clipboard');
    } catch (error) {
      showToast('Could not copy pattern', 'error');
    }
  });

  reveal.appendChild(code);
  reveal.appendChild(copyBtn);
  return reveal;
}

function buildToggle(inputId, checked, ariaLabel, onChange) {
  const toggleSwitch = document.createElement('label');
  toggleSwitch.className = 'switch';
  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.id = inputId;
  toggleInput.checked = checked;
  toggleInput.setAttribute('role', 'switch');
  toggleInput.setAttribute('aria-label', ariaLabel);
  toggleInput.addEventListener('change', onChange);
  const slider = document.createElement('span');
  slider.className = 'slider';
  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(slider);
  return { toggleSwitch, toggleInput };
}

let toggleIdCounter = 0;

function buildOptionRow({ label, pattern, icon, note }, disabledUrls, isSubOption) {
  const wrapper = document.createElement('div');
  wrapper.className = isSubOption ? 'option-wrap sub-option' : 'option-wrap';

  const optionDiv = document.createElement('div');
  optionDiv.className = 'option';

  const iconImg = document.createElement('img');
  iconImg.src = `icons/${icon}`;
  iconImg.alt = '';
  iconImg.className = 'option-icon';

  const labelText = document.createElement('span');
  labelText.textContent = label;

  const inputId = `toggle-${toggleIdCounter++}`;
  const labelContainer = document.createElement('label');
  labelContainer.className = 'label-container';
  labelContainer.htmlFor = inputId;

  const textBlock = document.createElement('span');
  textBlock.className = 'label-text';
  textBlock.appendChild(labelText);
  if (note) {
    const noteEl = document.createElement('small');
    noteEl.className = 'option-note';
    noteEl.textContent = note;
    textBlock.appendChild(noteEl);
  }

  labelContainer.appendChild(iconImg);
  labelContainer.appendChild(textBlock);

  const reveal = buildPatternReveal(pattern);
  const revealBtn = document.createElement('button');
  revealBtn.type = 'button';
  revealBtn.className = 'reveal-pattern-btn';
  revealBtn.innerHTML = SVG_CODE;
  revealBtn.title = 'Show the URL pattern this rule uses';
  revealBtn.setAttribute('aria-label', `Show URL pattern for ${label}`);
  revealBtn.setAttribute('aria-expanded', 'false');
  revealBtn.addEventListener('click', () => {
    reveal.hidden = !reveal.hidden;
    revealBtn.setAttribute('aria-expanded', String(!reveal.hidden));
  });

  const { toggleSwitch, toggleInput } = buildToggle(
    inputId,
    !disabledUrls.includes(pattern),
    `Enable ${label}`,
    (event) => {
      saveOptions();
      syncGroupMaster(event.target.closest('.service-group'));
    }
  );
  toggleInput.dataset.pattern = pattern;

  optionDiv.appendChild(labelContainer);
  optionDiv.appendChild(revealBtn);
  optionDiv.appendChild(toggleSwitch);
  wrapper.appendChild(optionDiv);
  wrapper.appendChild(reveal);
  return wrapper;
}

// Keep a group's master switch in sync with its members: on when any member is
// on, shown as mixed when members disagree
function syncGroupMaster(groupEl) {
  if (!groupEl) return;
  const master = groupEl.querySelector('input.group-master');
  const members = [...groupEl.querySelectorAll('input[data-pattern]')];
  const onCount = members.filter((m) => m.checked).length;
  master.checked = onCount > 0;
  master.indeterminate = onCount > 0 && onCount < members.length;
}

function buildGroup(groupName, members, disabledUrls) {
  const groupEl = document.createElement('div');
  groupEl.className = 'service-group';

  const header = document.createElement('div');
  header.className = 'option group-header';

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'group-expand-btn';
  expandBtn.setAttribute('aria-expanded', 'false');
  expandBtn.setAttribute('aria-label', `Show individual ${groupName} services`);
  expandBtn.innerHTML = SVG_CHEVRON;

  const groupIcon = (typeof groupMeta !== 'undefined' && groupMeta[groupName] && groupMeta[groupName].icon) || members[0].icon;
  const iconImg = document.createElement('img');
  iconImg.src = `icons/${groupIcon}`;
  iconImg.alt = '';
  iconImg.className = 'option-icon';

  const textBlock = document.createElement('span');
  textBlock.className = 'label-text';
  const labelText = document.createElement('span');
  labelText.textContent = groupName;
  const countNote = document.createElement('small');
  countNote.className = 'option-note';
  countNote.textContent = `${members.length} services`;
  textBlock.appendChild(labelText);
  textBlock.appendChild(countNote);

  const labelContainer = document.createElement('span');
  labelContainer.className = 'label-container';
  labelContainer.appendChild(iconImg);
  labelContainer.appendChild(textBlock);

  const membersEl = document.createElement('div');
  membersEl.className = 'group-members';
  membersEl.hidden = true;
  members.forEach((member) => {
    membersEl.appendChild(buildOptionRow(member, disabledUrls, true));
  });

  const toggleExpanded = () => {
    membersEl.hidden = !membersEl.hidden;
    expandBtn.setAttribute('aria-expanded', String(!membersEl.hidden));
    groupEl.classList.toggle('expanded', !membersEl.hidden);
  };
  expandBtn.addEventListener('click', toggleExpanded);
  labelContainer.addEventListener('click', toggleExpanded);

  // Master switch: flips every member at once
  const { toggleSwitch, toggleInput } = buildToggle(
    `toggle-${toggleIdCounter++}`,
    false,
    `Enable all ${groupName} services`,
    (event) => {
      groupEl.querySelectorAll('input[data-pattern]').forEach((member) => {
        member.checked = event.target.checked;
      });
      event.target.indeterminate = false;
      saveOptions();
    }
  );
  toggleInput.classList.add('group-master');

  // Chevron sits on the right, in the same slot as other rows' pattern
  // button, so the group's icon stays flush with the rest of the list
  header.appendChild(labelContainer);
  header.appendChild(expandBtn);
  header.appendChild(toggleSwitch);
  groupEl.appendChild(header);
  groupEl.appendChild(membersEl);
  syncGroupMaster(groupEl);
  return groupEl;
}

async function renderDefaultOptions() {
  const { disabledUrls = [] } = await api.storage.sync.get(['disabledUrls']);
  const container = document.getElementById('default-options');
  container.innerHTML = '';
  toggleIdCounter = 0;

  const groups = new Map();
  predefinedUrlPatterns.forEach((p) => {
    if (p.group) {
      if (!groups.has(p.group)) groups.set(p.group, []);
      groups.get(p.group).push(p);
    }
  });

  const renderedGroups = new Set();
  predefinedUrlPatterns.forEach((p) => {
    if (p.group) {
      if (renderedGroups.has(p.group)) return;
      renderedGroups.add(p.group);
      container.appendChild(buildGroup(p.group, groups.get(p.group), disabledUrls));
    } else {
      container.appendChild(buildOptionRow(p, disabledUrls, false));
    }
  });
}

// Live regex validation under the custom URL input
function validateCustomUrlInput() {
  const input = document.getElementById('custom-url');
  const errorEl = document.getElementById('custom-url-error');
  const submitBtn = document.querySelector('#custom-url-form button[type="submit"]');
  const isRegex = document.getElementById('url-type-regex').checked;

  let message = '';
  if (isRegex && input.value.trim()) {
    try {
      new RegExp(input.value.trim());
    } catch (error) {
      message = error.message;
    }
  }

  errorEl.textContent = message;
  errorEl.hidden = !message;
  input.classList.toggle('input-error', !!message);
  submitBtn.disabled = !!message;
}

async function saveCustomUrl(event) {
  event.preventDefault();
  const customUrl = document.getElementById('custom-url').value.trim();
  const isRegex = document.getElementById('url-type-regex').checked;

  if (isRegex) {
    try {
      new RegExp(customUrl);
    } catch (e) {
      showToast(`Invalid regular expression: ${e.message}`, 'error');
      return;
    }
  }

  const { customUrls = [] } = await api.storage.sync.get(['customUrls']);

  if (customUrls.some((item) => customUrlMatches(item, customUrl, isRegex))) {
    showToast('This URL pattern is already in your list.', 'error');
    return;
  }

  customUrls.push({
    url: customUrl,
    enabled: true,
    isRegex: isRegex,
    dateAdded: new Date().toISOString()
  });

  if (!await saveSync({ customUrls })) return;

  renderCustomUrls();
  document.getElementById('custom-url').value = '';
  document.getElementById('url-type-exact').checked = true;
  toggleRegexHelp(); // Hide regex help
  validateCustomUrlInput();

  showToast(isRegex
    ? 'Regex pattern added — matching tabs will now close.'
    : 'URL added — it matches exactly what you entered.');
}

async function renderCustomUrls() {
  const { customUrls = [] } = await api.storage.sync.get(['customUrls']);
  const list = document.getElementById('custom-url-list');
  list.innerHTML = '';

  if (customUrls.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'empty-state';
    emptyLi.textContent = 'No custom URLs added yet';
    list.appendChild(emptyLi);
    return;
  }

  customUrls.forEach(({ url, enabled, isRegex = false }) => {
    const li = document.createElement('li');
    li.className = 'custom-url-item';

    // URL display with type indicator
    const urlContainer = document.createElement('div');
    urlContainer.className = 'url-container';

    const typeIndicator = document.createElement('span');
    typeIndicator.className = `type-indicator ${isRegex ? 'regex' : 'exact'}`;
    typeIndicator.textContent = isRegex ? 'RegEx' : 'Exact';
    typeIndicator.title = isRegex ? 'Regular Expression Pattern' : 'Exact URL Match';

    const urlSpan = document.createElement('span');
    urlSpan.className = 'url-text';
    urlSpan.textContent = url;
    urlSpan.title = url; // Show full URL on hover

    urlContainer.appendChild(typeIndicator);
    urlContainer.appendChild(urlSpan);
    li.appendChild(urlContainer);

    // Toggle switch
    const { toggleSwitch } = buildToggle(
      `custom-toggle-${toggleIdCounter++}`,
      enabled,
      `Enable custom URL ${url}`,
      () => toggleCustomUrl(url, isRegex)
    );
    li.appendChild(toggleSwitch);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = SVG_TRASH;
    removeBtn.setAttribute('aria-label', `Remove ${url}`);
    removeBtn.onclick = () => removeCustomUrl(url, isRegex);
    li.appendChild(removeBtn);

    list.appendChild(li);
  });
}

// Custom URLs are identified by value (url + type), not list index — the list
// can change underneath us via another window or a sync from another machine
function customUrlMatches(item, url, isRegex) {
  return item.url === url && (item.isRegex === true) === isRegex;
}

async function toggleCustomUrl(url, isRegex) {
  const { customUrls = [] } = await api.storage.sync.get(['customUrls']);
  const item = customUrls.find((entry) => customUrlMatches(entry, url, isRegex));
  if (item) {
    item.enabled = !item.enabled;
    await saveSync({ customUrls });
  }
  renderCustomUrls();
}

async function removeCustomUrl(url, isRegex) {
  const { customUrls = [] } = await api.storage.sync.get(['customUrls']);
  const remaining = customUrls.filter((entry) => !customUrlMatches(entry, url, isRegex));
  if (remaining.length !== customUrls.length) {
    if (await saveSync({ customUrls: remaining })) {
      showToast('Custom URL removed.');
    }
  }
  renderCustomUrls();
}

async function loadCheckInterval() {
  const { interval = 15 } = await api.storage.sync.get(['interval']);
  document.getElementById('check-interval').value = interval;
}

async function loadShowCountdown() {
  const { showCountdown = true } = await api.storage.sync.get(['showCountdown']);
  document.getElementById('show-countdown').checked = showCountdown;
}

async function saveCheckInterval() {
  const interval = parseInt(document.getElementById('check-interval').value, 10);
  if (interval > 0) {
    if (await saveSync({ interval })) {
      if (debug) console.log('Check interval saved:', interval);
    }
  }
}

async function exportSettings() {
  const { customUrls = [], disabledUrls = [], interval = 15, showCountdown = true } =
    await api.storage.sync.get(['customUrls', 'disabledUrls', 'interval', 'showCountdown']);
  const payload = {
    app: 'TabCloser',
    settingsVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: { customUrls, disabledUrls, interval, showCountdown },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tabcloser-settings.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Delay revocation — revoking synchronously can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Settings exported.');
}

async function importSettings(file) {
  let text;
  try {
    text = await file.text();
  } catch (error) {
    showToast('Could not read the selected file.', 'error');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    showToast('Import failed: the selected file is not valid JSON.', 'error');
    return;
  }

  const settings = payload && payload.app === 'TabCloser' ? payload.settings : null;
  if (!settings || typeof settings !== 'object') {
    showToast('Import failed: this does not look like a TabCloser settings file.', 'error');
    return;
  }

  const { customUrls = [] } = await api.storage.sync.get(['customUrls']);

  // Merge imported custom URLs into the existing list, skipping duplicates
  // and entries that are malformed or have an invalid regex
  const imported = Array.isArray(settings.customUrls) ? settings.customUrls : [];
  let added = 0;
  let skipped = 0;
  imported.forEach((item) => {
    if (!item || typeof item.url !== 'string' || !item.url.trim()) {
      skipped++;
      return;
    }
    const isRegex = item.isRegex === true;
    if (isRegex) {
      try {
        new RegExp(item.url);
      } catch (e) {
        skipped++;
        return;
      }
    }
    if (customUrls.some((existing) => customUrlMatches(existing, item.url, isRegex))) return;
    customUrls.push({
      url: item.url,
      enabled: item.enabled !== false,
      isRegex,
      dateAdded: item.dateAdded || new Date().toISOString(),
    });
    added++;
  });

  const updates = { customUrls };

  // Service toggles and close time replace the current values when present.
  // Old pattern strings are rewritten to their current forms; unknown strings
  // are kept as-is so a file exported from a newer version still imports cleanly.
  if (Array.isArray(settings.disabledUrls)) {
    updates.disabledUrls = [...new Set(
      settings.disabledUrls
        .filter((pattern) => typeof pattern === 'string')
        .map((pattern) => legacyPatternMap[pattern] || pattern)
    )];
  }
  const interval = parseInt(settings.interval, 10);
  if (interval > 0) {
    updates.interval = interval;
  }
  if (typeof settings.showCountdown === 'boolean') {
    updates.showCountdown = settings.showCountdown;
  }

  if (!await saveSync(updates)) return;

  renderDefaultOptions();
  renderCustomUrls();
  loadCheckInterval();
  loadShowCountdown();
  const parts = [`${added} custom URL${added === 1 ? '' : 's'} added`];
  if (skipped > 0) parts.push(`${skipped} invalid entr${skipped === 1 ? 'y' : 'ies'} skipped`);
  if (updates.disabledUrls) parts.push('service toggles restored');
  if (updates.interval) parts.push('close time restored');
  if ('showCountdown' in updates) parts.push('badge preference restored');
  showToast(`Import complete: ${parts.join(', ')}.`);
}

function toggleRegexHelp() {
  const regexRadio = document.getElementById('url-type-regex');
  const regexHelp = document.getElementById('regex-help');

  if (regexRadio && regexHelp) {
    regexHelp.style.display = regexRadio.checked ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderDefaultOptions();
  renderCustomUrls();
  loadCheckInterval();
  loadShowCountdown();

  document.getElementById('custom-url-form').addEventListener('submit', saveCustomUrl);
  document.getElementById('check-interval').addEventListener('change', saveCheckInterval);
  document.getElementById('show-countdown').addEventListener('change', (event) => {
    saveSync({ showCountdown: event.target.checked });
  });

  // Close time +/- steppers; manual typing still goes through the change
  // listener above
  document.querySelectorAll('.stepper-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('check-interval');
      const min = parseInt(input.min, 10) || 1;
      const current = parseInt(input.value, 10);
      const next = (Number.isNaN(current) ? 15 : current) + Number(btn.dataset.step);
      input.value = Math.max(min, next);
      input.dispatchEvent(new Event('change'));
    });
  });

  // Backup & restore
  document.getElementById('export-settings').addEventListener('click', exportSettings);
  document.getElementById('import-settings').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) importSettings(file);
    event.target.value = ''; // Allow re-importing the same file
  });

  // Regex help visibility + live validation
  const regexRadio = document.getElementById('url-type-regex');
  const exactRadio = document.getElementById('url-type-exact');
  const customUrlInput = document.getElementById('custom-url');

  const onTypeChange = () => {
    toggleRegexHelp();
    validateCustomUrlInput();
  };
  regexRadio.addEventListener('change', onTypeChange);
  exactRadio.addEventListener('change', onTypeChange);
  customUrlInput.addEventListener('input', validateCustomUrlInput);

  toggleRegexHelp();

  // Show the installed version in the footer
  const versionLink = document.getElementById('version-link');
  if (versionLink) {
    versionLink.textContent = `v${api.runtime.getManifest().version}`;
  }
});
