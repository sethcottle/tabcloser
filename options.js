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

function saveOptions() {
  const disabledUrls = [];
  predefinedUrlPatterns.forEach(({ pattern }) => {
    const checkbox = document.getElementById(pattern);
    if (!checkbox.checked) {
      disabledUrls.push(pattern);
    }
  });
  chrome.storage.sync.set({ disabledUrls }, () => {
    if (debug) {
      console.log('Options saved. Disabled URLs:', disabledUrls);
    }
  });
}

function renderCheckboxes() {
  chrome.storage.sync.get(['disabledUrls'], ({ disabledUrls }) => {
    if (!disabledUrls) {
      disabledUrls = [];
    }
    predefinedUrlPatterns.forEach(({ label, pattern }) => {
      const isChecked = !disabledUrls.includes(pattern);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = pattern;
      checkbox.checked = isChecked;
      checkbox.addEventListener('click', saveOptions);
      const labelElement = document.createElement('label');
      labelElement.htmlFor = pattern;
      labelElement.appendChild(checkbox);
      labelElement.appendChild(document.createTextNode(label));
      document.getElementById('url-options').appendChild(labelElement);
    });
  });
}

function loadCheckInterval() {
  chrome.storage.sync.get(['interval'], ({ interval }) => {
    if (!interval) {
      interval = 15;
    }
    const checkIntervalInput = document.getElementById('check-interval');
    checkIntervalInput.value = interval;
    checkIntervalInput.addEventListener('input', () => {
      const newValue = parseInt(checkIntervalInput.value, 10);
      if (newValue > 0) {
        chrome.storage.sync.set({ interval: newValue }, () => {
          if (debug) {
            console.log('Check interval saved:', newValue);
          }
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderCheckboxes();
  loadCheckInterval();
});