 // Copyright (C) 2023-2024 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details. 

const debug = false; // Set to true when you need to debug

const predefinedUrlPatterns = [
  { label: 'Asana', pattern: '^https?://app\\.asana\\.com/-/desktop_app_link\\?.*', icon: 'asana.svg'},
  { label: 'AWS IAM Access Auth Success', pattern: '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success.html', icon: 'aws-iam.svg'},
  { label: 'Discord Invites', pattern: '^https?://discord\\.com/invite/', icon: 'discord.svg'},
  { label: 'Figma Design Files', pattern: '^https?://(?:www\.)?figma\.com/design/', icon: 'figma-design.svg'},
  { label: 'Figjam Files', pattern: '^https?://(?:www\.)?figma\.com/board/', icon: 'figma-figjam.svg'},
  { label: 'Figma Slide Files', pattern: '^https?://(?:www\.)?figma\.com/slides/', icon: 'figma-slides.svg'},
  { label: 'Linear', pattern: '^https?://linear\\.app/.*\\?noRedirect=1$', icon: 'linear.svg'},
  { label: 'Microsoft Teams', pattern: '^https?://teams\\.microsoft\\.com/dl/launcher/.*', icon: 'teams.svg'},
  { label: 'Notion', pattern: '^https?://www\\.notion\\.so/native/.*&deepLinkOpenNewTab=true', icon: 'notion.svg'},
  { label: 'Slack', pattern: '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|.*\\/(customize|account|apps)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.slack\\.com/.*$', icon: 'slack.svg'},
  { label: 'Spotify', pattern: '^https?://open\\.spotify\\.com', icon: 'spotify.svg'},
  { label: 'VS Code Live Share', pattern: '^https?://vscode\\.dev/liveshare', icon: 'code.svg'},
  { label: 'Webex Joins', pattern: '^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice', icon: 'webex.svg'},
  { label: 'Zoom Joins', pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/j/[^/]+#success$', icon: 'zoom.svg'},
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
    console.log('Default options saved');
  });
}

function renderDefaultOptions() {
  chrome.storage.sync.get(['disabledUrls'], ({ disabledUrls = [] }) => {
    const container = document.getElementById('default-options');
    container.innerHTML = '';
    predefinedUrlPatterns.forEach(({ label, pattern, icon }) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'option';

      const iconImg = document.createElement('img');
      iconImg.src = `icons/${icon}`;
      iconImg.alt = `${label} icon`;
      iconImg.className = 'option-icon';

      const labelElement = document.createElement('label');
      labelElement.textContent = label;

      const labelContainer = document.createElement('div');
      labelContainer.className = 'label-container';
      labelContainer.appendChild(iconImg);
      labelContainer.appendChild(labelElement);

      const toggleSwitch = document.createElement('label');
      toggleSwitch.className = 'switch';
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = !disabledUrls.includes(pattern);
      toggleInput.addEventListener('change', () => saveOptions());
      const slider = document.createElement('span');
      slider.className = 'slider';

      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(slider);

      optionDiv.appendChild(labelContainer);
      optionDiv.appendChild(toggleSwitch);
      container.appendChild(optionDiv);
    });
  });
}

function saveOptions() {
  const disabledUrls = [];
  document.querySelectorAll('#default-options .option').forEach((option, index) => {
    const checkbox = option.querySelector('input[type="checkbox"]');
    if (!checkbox.checked) {
      disabledUrls.push(predefinedUrlPatterns[index].pattern);
    }
  });
  chrome.storage.sync.set({ disabledUrls }, () => {
    if (debug) {
      console.log('Options saved. Disabled URLs:', disabledUrls);
    }
  });
}

// Call renderDefaultOptions() when the page loads
document.addEventListener('DOMContentLoaded', () => {
  renderDefaultOptions();
});

function saveCustomUrl(event) {
  event.preventDefault();
  let customUrl = document.getElementById('custom-url').value.trim();
  
  chrome.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    if (!customUrls.some(item => item.url === customUrl)) {
      customUrls.push({ url: customUrl, enabled: true });
      chrome.storage.sync.set({ customUrls }, () => {
        renderCustomUrls();
        document.getElementById('custom-url').value = '';
        
        // Provide feedback to the user
        alert(`URL added: ${customUrl}\n\nThis will only match exactly what you entered. For example:\n\n` +
              `• If you entered "https://www.example.com", it will only match "https://www.example.com"\n` +
              `• It will NOT match "http://www.example.com", "https://example.com", https://subdomain.example.com", ..etc. \n\n` +
              `To match variations of this URL, you need to add them separately. This makes sure TabCloser doesn't unexpectedly close a tab on accident.`);
      });
    } else {
      alert('This URL is already in your list.');
    }
  });
}

function renderCustomUrls() {
  chrome.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    const list = document.getElementById('custom-url-list');
    list.innerHTML = '';
    customUrls.forEach(({ url, enabled }, index) => {
      const li = document.createElement('li');
      
      const urlSpan = document.createElement('span');
      urlSpan.textContent = url;
      li.appendChild(urlSpan);

      const toggleSwitch = document.createElement('label');
      toggleSwitch.className = 'switch';
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = enabled;
      toggleInput.onchange = () => toggleCustomUrl(index);
      const slider = document.createElement('span');
      slider.className = 'slider';
      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(slider);
      li.appendChild(toggleSwitch);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn custom-url-remove-btn'; // Updated class
      removeBtn.textContent = '🗑️'; // Unicode trash can symbol
      removeBtn.setAttribute('aria-label', 'Remove URL');
      removeBtn.onclick = () => removeCustomUrl(index);
      li.appendChild(removeBtn);

      list.appendChild(li);
    });
  });
}

function toggleCustomUrl(index) {
  chrome.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    customUrls[index].enabled = !customUrls[index].enabled;
    chrome.storage.sync.set({ customUrls }, renderCustomUrls);
  });
}

// Update this function to change the button appearance when toggled
function toggleCustomUrl(index) {
  chrome.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    customUrls[index].enabled = !customUrls[index].enabled;
    chrome.storage.sync.set({ customUrls }, () => {
      renderCustomUrls(); // Re-render the list to update the button appearance
    });
  });
}

function toggleCustomUrl(index) {
  chrome.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    customUrls[index].enabled = !customUrls[index].enabled;
    chrome.storage.sync.set({ customUrls }, renderCustomUrls);
  });
}

function removeCustomUrl(index) {
  chrome.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    customUrls.splice(index, 1);
    chrome.storage.sync.set({ customUrls }, renderCustomUrls);
  });
}

function loadCheckInterval() {
  chrome.storage.sync.get(['interval'], ({ interval = 15 }) => {
    document.getElementById('check-interval').value = interval;
  });
}

function saveCheckInterval() {
  const interval = parseInt(document.getElementById('check-interval').value, 10);
  if (interval > 0) {
    chrome.storage.sync.set({ interval }, () => {
      console.log('Check interval saved:', interval);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderDefaultOptions();
  renderCustomUrls();
  loadCheckInterval();
  document.getElementById('custom-url-form').addEventListener('submit', saveCustomUrl);
  document.getElementById('check-interval').addEventListener('change', saveCheckInterval);
});
