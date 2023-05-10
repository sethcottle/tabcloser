<img src="https://cdn.cottle.cloud/tabcloser/tabcloser.svg" width="150">

# TabCloser

## What is TabCloser?
Tabcloser is an extension for Chromium browsers that automatically closes redirected <b>Discord</b> invites, <b>Figma</b> files, <b>Spotify</b>, <b>VS Code Live Share</b>, and join meeting sessions for <b>Webex</b> and <b>Zoom</b>.

![Tabs](https://cdn.cottle.cloud/tabcloser/tabs.svg)

## TabCloser Options

By default, Discord invites, Figma files, Spotify, VS Code Live Share, Webex Joins, and Zoom Joins are enabled. Just deselect any service that you don't want tabs to close for automatically. You can also change the interval that TabCloser uses to close a new tab once a new tab has been opened, by default it's `15 seconds` + `5 second new tab buffer` = `20 seconds`. The New Tab Buffer ensures TabCloser has enough time to detect a new tab and a URL if you're manually copy + pasting a link into a new tab.

![TabCloser Options](https://cdn.cottle.cloud/tabcloser/options.svg)

#### URL Schema

Let's breakdown how TabCloser decides if it should close a tab. TabCloser is using regular expressions to look for a partial match on a dedicated URL for each service.

Here's how TabCloser is handling URLs for each service:

`^`: The start of the URL

`https?://`: This will match "http://" or "https://"

`([a-z0-9-]+\\.)?`: This isn't included in each service, but it's to detect a subdomain, followed by a dot "."

`example\\.com/`: This matches the primary URL of a particular service

#### Discord
For Discord, TabCloser is using `^https?://discord\\.com/invite/`. 

The `/invite/` is associated with a Discord invite which can be opened in the Discord desktop client.

#### Figma
For Figma, TabCloser is using `^https?://(?:www\.)?figma\.com/file/`

The `figma.com/file` designates it is a file URL. TabCloser <b>will not</b> close tabs for Figma Community profiles, templates, plugins, ..etc. Only file URLs can be redirected to the Figma desktop client.

#### Spotify
For Spotify, TabCloser is using `^https?://open\\.spotify\\.com` 

The `open\\.` portion is typically associated with opening a song, artist, playlist, ..etc which can be opened in the Spotify desktop client.

#### VS Code Live Share
For Live Share, TabCloser is using `^https?://vscode\\.dev/liveshare`. 

The `/liveshare/` is associated with the Live Share URL which can be opened in the VS Code desktop client.

#### Webex
For Webex, TabCloser is using `^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice`. 

The `webex\\.com/wbxmjs/joinservice` is associated with the join meeting URL which can be opened in the Webex desktop client.

#### Zoom
For Zoom, TabCloser is using `^https?://([a-z0-9-]+\\.)?zoom\\.us/j/[^/]+#success$`

The `([a-z0-9-]+\\.)?` and looking for `zoom\\.us/j/` as a designated join link, and then looking for `#success` when a Zoom link is successfully redirected to the Zoom desktop client.

## Requested Permissions
TabCloser requests a few permissions in the `manifest.json` file.

`chrome.tabs` allows TabCloser to interact with your tabs, giving it the ability to run when a new tab is detected and if a matched URL is found, close that tab automatically.

`chrome.storage` allows TabCloser to save your `enabled` or `disabled` auto close preferences for a particular service and saves the interval you've set for closing tabs from the options menu.

#### Privacy

TabCloser runs completely locally in your browser. It does not collect any analytics, it does not store any information about your tabs or browser history, it does not send any data back for processing or analysis. Your data is yours and yours alone. 

## Installing TabCloser

TabCloser is available in the Google Chrome Web Store, the Microsoft Edge Add-ons Store, and available for manual download and installation.

[![Get on the Google Chrome Web Store](https://cdn.cottle.cloud/tabcloser/button-chrome.svg)](https://chrome.google.com/webstore/detail/tabcloser/ebhkgfbgbcaphagkjbiffhnfbmkkbadb?hl=en&authuser=0)

[![Get on the Microsoft Edge Store](https://cdn.cottle.cloud/tabcloser/button-edge.svg)](https://microsoftedge.microsoft.com/addons/detail/tabcloser/odipgobonaabhgghappnhfjimopchehg)

[![Download the Latest GitHub Release](https://cdn.cottle.cloud/tabcloser/download-release.svg)](https://github.com/sethcottle/tabcloser/zipball/main)

#### For Chrome
Download the latest release and unzip it. Then navigate to `chrome://extensions/` and enable "Developer mode" using the toggle in the top right corner. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

#### For Edge
Download the latest relase and unzip it. Then navigate to `edge://extensions/` and enable "Developer mode" in the left sidebar, it's near the bottom. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

## Support the Addon

[![Buy Me A Coffee](https://cdn.cottle.cloud/tabcloser/buymeacoffee.svg)](https://buymeacoffee.com/seth)

