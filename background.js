const predefinedUrlPartials = [
  'figma.com/file/',
  'zoom.us/j/',
  'open.spotify.com',
  `vscode.dev/liveshare/`
];

const timePeriodMilliseconds = 30 * 1000; // 30 seconds

function urlMatchesPartial(url) {
  return predefinedUrlPartials.some(partial => url.includes(partial));
}

function hasAdditionalPath(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname !== '/';
  } catch (error) {
    return false;
  }
}

async function closeMatchingTabs() {
  const tabs = await new Promise(resolve => chrome.tabs.query({}, resolve));
  for (const tab of tabs) {
    if (urlMatchesPartial(tab.url) && hasAdditionalPath(tab.url)) {
      setTimeout(async () => {
        try {
          const updatedTab = await new Promise((resolve, reject) =>
            chrome.tabs.get(tab.id, result => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result);
              }
            })
          );
          if (updatedTab && urlMatchesPartial(updatedTab.url)) {
            chrome.tabs.remove(updatedTab.id);
          }
        } catch (error) {
          console.error('Error:', error.message, '\nStack Trace:', error.stack);
        }
      }, timePeriodMilliseconds);
    }
  }
}

chrome.tabs.onCreated.addListener(closeMatchingTabs);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    closeMatchingTabs();
  }
});
