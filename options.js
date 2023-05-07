const predefinedUrlPatterns = [
  {
    label: ' Zoom Joins',
    pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/j/[^/]+#success$',
  },
  {
    label: ' Figma Files',
    pattern: '^https?://([a-z0-9-]+\\.)?figma\\.com/file/[^?]+\\?[^&]+&fuid=[^&]+',
  },
  {
    label: ' Spotify',
    pattern: '^https?://open\\.spotify\\.com',
  },
  {
    label: ' Discord Invites',
    pattern: '^https?://([a-z0-9-]+\\.)?discord\\.com/invite/',
  },
  {
    label: ' VS Code Live Share',
    pattern: '^https?://vscode\\.dev/liveshare',
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
    console.log('Options saved');
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
  chrome.storage.sync.get(['checkInterval'], ({ checkInterval }) => {
    if (!checkInterval) {
      checkInterval = 30;
    }
    const checkIntervalInput = document.getElementById('check-interval');
    checkIntervalInput.value = checkInterval;
    checkIntervalInput.addEventListener('input', () => {
      const newValue = parseInt(checkIntervalInput.value, 10);
      if (newValue > 0) {
        chrome.storage.sync.set({ checkInterval: newValue }, () => {
          console.log('Check interval saved');
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderCheckboxes();
  loadCheckInterval();
});
