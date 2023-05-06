const predefinedUrlPartials = [
    { url: 'figma.com/file/', label: ' Figma Files' },
    { url: 'zoom.us/j/', label: ' Zoom Joins' },
    { url: 'open.spotify.com', label: ' Spotify' },
    { url: 'vscode.dev/liveshare/', label: ' VS Code Live Share' },
    { url: 'discord.com/invite/', label: ' Discord Invites' }
  ];
  
  function saveOptions() {
    const disabledUrls = [];
    for (const { url } of predefinedUrlPartials) {
      const checkbox = document.getElementById(url);
      if (!checkbox.checked) {
        disabledUrls.push(url);
      }
    }
    chrome.storage.sync.set({ disabledUrls }, () => {
      console.log('Options saved.');
    });
  }
  
  function loadOptions() {
    chrome.storage.sync.get(['disabledUrls'], ({ disabledUrls }) => {
      if (!disabledUrls) {
        disabledUrls = [];
      }
      const form = document.getElementById('options-form');
      for (const { url, label } of predefinedUrlPartials) {
        const checkboxLabel = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = url;
        checkbox.checked = !disabledUrls.includes(url);
        checkbox.addEventListener('change', saveOptions);
        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(document.createTextNode(label));
        form.appendChild(checkboxLabel);
        form.appendChild(document.createElement('br'));
      }
      if (disabledUrls.length === 0) {
        saveOptions(); // Save the default disabled URLs when the options are loaded for the first time
      }
    });
  }
  
  // Load options when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadOptions);
  } else {
    loadOptions();
  }