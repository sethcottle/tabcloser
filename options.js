// Copyright (C) 2023-2025 Seth Cottle

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

const debug = false; // Set to true when you need to debug

const predefinedUrlPatterns = [
  { label: 'Asana', pattern: '^https?://app\\.asana\\.com/-/desktop_app_link\\?.*', icon: 'asana.svg'},
  { label: 'AWS IAM Access Auth Success', pattern: '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success.html', icon: 'aws-iam.svg'},
  { label: 'Discord Invites', pattern: '^https?://discord\\.com/invite/', icon: 'discord.svg'},
  { label: 'Figma Design Files', pattern: '^https?://(?:www\.)?figma\.com/design/', icon: 'figma-design.svg'},
  { label: 'Figjam Files', pattern: '^https?://(?:www\.)?figma\.com/board/', icon: 'figma-figjam.svg'},
  { label: 'Figma Slide Files', pattern: '^https?://(?:www\.)?figma\.com/slides/', icon: 'figma-slides.svg'},
  { label: 'Linear', pattern: '^https?://linear\\.app/(?!integrations(/|$)|settings(/|$)).*\\?noRedirect=1$', icon: 'linear.svg'},
  { label: 'Microsoft Teams', pattern: '^https?://teams\\.microsoft\\.com/dl/launcher/.*', icon: 'teams.svg'},
  { label: 'Notion', pattern: '^https?://www\\.notion\\.so/native/.*&deepLinkOpenNewTab=true', icon: 'notion.svg'},
  { label: 'Slack', pattern: '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|.*\\/(customize|account|apps|marketplace)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.(enterprise\\.)?slack\\.com/(?:.*|ssb/signin_redirect\\?.*$)', icon: 'slack.svg'},
  { label: 'Spotify', pattern: '^https?://open\\.spotify\\.com', icon: 'spotify.svg'},
  { label: 'VS Code Live Share', pattern: '^https?://vscode\\.dev/liveshare', icon: 'code.svg'},
  { label: 'Webex Joins', pattern: '^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice', icon: 'webex.svg'},
  { label: 'Zoom Joins', pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/[js]/[^/]+.*#success$', icon: 'zoom.svg'},
];

function saveOptions() {
  const disabledUrls = [];
  predefinedUrlPatterns.forEach(({ pattern }) => {
    const checkbox = document.getElementById(pattern);
    if (!checkbox.checked) {
      disabledUrls.push(pattern);
    }
  });
  api.storage.sync.set({ disabledUrls }, () => {
    console.log('Default options saved');
  });
}

function renderDefaultOptions() {
  api.storage.sync.get(['disabledUrls'], ({ disabledUrls = [] }) => {
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
  api.storage.sync.set({ disabledUrls }, () => {
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
  const isRegex = document.getElementById('url-type-regex').checked;
  
  // Validate regex pattern if regex mode is selected
  if (isRegex) {
    try {
      new RegExp(customUrl);
    } catch (e) {
      alert(`Invalid regular expression: ${e.message}\n\nPlease check your pattern and try again.`);
      return;
    }
  }
  
  api.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    // Check for duplicates
    const isDuplicate = customUrls.some(item => 
      item.url === customUrl && item.isRegex === isRegex
    );
    
    if (!isDuplicate) {
      customUrls.push({ 
        url: customUrl, 
        enabled: true, 
        isRegex: isRegex,
        dateAdded: new Date().toISOString()
      });
      
      api.storage.sync.set({ customUrls }, () => {
        renderCustomUrls();
        document.getElementById('custom-url').value = '';
        document.getElementById('url-type-exact').checked = true;
        toggleRegexHelp(); // Hide regex help
        
        // Provide feedback based on type
        const feedbackMessage = isRegex ? 
          `Regex pattern added: ${customUrl}\n\nThis will match URLs based on your regular expression pattern.` :
          `URL added: ${customUrl}\n\nThis will only match exactly what you entered. For example:\n\n` +
          `• If you entered "https://www.example.com", it will only match "https://www.example.com"\n` +
          `• It will NOT match "http://www.example.com", "https://example.com", "https://subdomain.example.com", etc.\n\n` +
          `To match variations of this URL, you need to add them separately or use a regex pattern.`;
        
        alert(feedbackMessage);
      });
    } else {
      alert('This URL pattern is already in your list.');
    }
  });
}

function renderCustomUrls() {
  api.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    const list = document.getElementById('custom-url-list');
    list.innerHTML = '';

    if (customUrls.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-state';
      emptyLi.textContent = 'No custom URLs added yet';
      list.appendChild(emptyLi);
      return;
    }

    customUrls.forEach(({ url, enabled, isRegex = false }, index) => {
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

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn custom-url-remove-btn';
      removeBtn.textContent = '🗑️';
      removeBtn.setAttribute('aria-label', 'Remove URL');
      removeBtn.onclick = () => removeCustomUrl(index);
      li.appendChild(removeBtn);

      list.appendChild(li);
    });
  });
}

function toggleCustomUrl(index) {
  api.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    customUrls[index].enabled = !customUrls[index].enabled;
    api.storage.sync.set({ customUrls }, renderCustomUrls);
  });
}

function removeCustomUrl(index) {
  api.storage.sync.get(['customUrls'], ({ customUrls = [] }) => {
    customUrls.splice(index, 1);
    api.storage.sync.set({ customUrls }, renderCustomUrls);
  });
}

function loadCheckInterval() {
  api.storage.sync.get(['interval'], ({ interval = 15 }) => {
    document.getElementById('check-interval').value = interval;
  });
}

function saveCheckInterval() {
  const interval = parseInt(document.getElementById('check-interval').value, 10);
  if (interval > 0) {
    api.storage.sync.set({ interval }, () => {
      console.log('Check interval saved:', interval);
    });
  }
}

function toggleRegexHelp() {
  const regexRadio = document.getElementById('url-type-regex');
  const regexHelp = document.getElementById('regex-help');

  if (regexRadio && regexHelp) {
    regexHelp.style.display = regexRadio.checked ? 'block' : 'none';
  }
}

// Collapsible sections
function initCollapsibleSections() {
  api.storage.sync.get(['collapsedSections'], ({ collapsedSections = [] }) => {
    document.querySelectorAll('.section-header').forEach(header => {
      const section = header.dataset.section;
      const content = document.querySelector(`.section-content[data-section="${section}"]`);
      if (!content) return;

      // Restore collapsed state
      if (collapsedSections.includes(section)) {
        header.classList.add('collapsed');
        content.classList.add('collapsed');
      }

      header.addEventListener('click', () => {
        const isCollapsed = header.classList.toggle('collapsed');
        content.classList.toggle('collapsed');

        // Persist state
        api.storage.sync.get(['collapsedSections'], ({ collapsedSections = [] }) => {
          if (isCollapsed) {
            if (!collapsedSections.includes(section)) {
              collapsedSections.push(section);
            }
          } else {
            collapsedSections = collapsedSections.filter(s => s !== section);
          }
          api.storage.sync.set({ collapsedSections });
        });
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderDefaultOptions();
  renderCustomUrls();
  loadCheckInterval();
  initCollapsibleSections();

  document.getElementById('custom-url-form').addEventListener('submit', saveCustomUrl);
  document.getElementById('check-interval').addEventListener('change', saveCheckInterval);

  // Add event listeners for regex help toggle
  const regexRadio = document.getElementById('url-type-regex');
  const exactRadio = document.getElementById('url-type-exact');

  if (regexRadio) regexRadio.addEventListener('change', toggleRegexHelp);
  if (exactRadio) exactRadio.addEventListener('change', toggleRegexHelp);

  // Initialize regex help visibility
  toggleRegexHelp();
});