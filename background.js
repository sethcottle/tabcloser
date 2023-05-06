const predefinedUrlPartials = [
  'figma.com/file/',
  'zoom.us/j/',
  'open.spotify.com',
  'vscode.dev/liveshare/',
  'discord.com/invite/'
];

function shouldCloseTab(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['disabledUrls'], ({ disabledUrls }) => {
      if (!disabledUrls) {
        disabledUrls = [];
      }
      const shouldClose = predefinedUrlPartials.some((partial) => url.includes(partial) && !disabledUrls.includes(partial));
      resolve(shouldClose);
    });
  });
}

async function checkTab(tab) {
  const shouldClose = await shouldCloseTab(tab.url);
  if (shouldClose) {
    chrome.tabs.remove(tab.id);
  }
}

chrome.alarms.create({ periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      setTimeout(() => {
        checkTab(tab);
      }, 15000); // 15 seconds
    });
  });
});
