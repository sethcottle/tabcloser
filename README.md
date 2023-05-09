<img src="https://cdn.cottle.cloud/tabcloser/tabcloser.svg" width="150">

# TabCloser

## What is TabCloser?
Tabcloser is an extension for Chromium browsers that automatically closees redirected <b>Discord</b> invites, <b>Figma</b> files, <b>Spotify</b>, <b>VS Code Live Share</b>, and join sessions for <b>Webex</b> and <b>Zoom</b>.

![Tabs](https://cdn.cottle.cloud/tabcloser/tabs.svg)

## TabCloser Options

By default, Discord invites, Figma files, Spotify, VS Code Live Share, Webex Joins, and Zoom Joins are enabled. Just deselect any service that you don't want tabs to close for automatically. You can also change the interval that TabCloser uses to close a new tab once a new tab has been opened, by default it's `15 seconds` + `5 second new tab buffer` = `20 seconds`. The New Tab Buffer ensures TabCloser has enough time to detect a new tab and a URL if you're manually copy + pasting a link into a new tab.

![TabCloser Options](https://cdn.cottle.cloud/tabcloser/options.svg)

Let's breakdown how TabCloser decides if it should close a tab. TabCloser is using regular expressions to look for a partial match on a dedicated URL for each service.

Here's how TabCloser is handling regular expressions:

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

`chrome.tabs` allows TabCloser to interact with Figma, Join Zoom, Spotify, VS Code Live Share, and Discord Invite tabs and close them.

`chrome.storage` allows TabCloser to save your `enabled` or `disabled` auto close preferences for a particular service and saves the interval you've set for checking tabs from the options menu.

## Installing TabCloser

![Google Chrome](https://cdn.cottle.cloud/tabcloser/chrome-soon.svg)

![Microsoft Edge](https://cdn.cottle.cloud/tabcloser/edge-soon.svg)

[![Latest GitHub Release](https://cdn.cottle.cloud/tabcloser/download-release.svg)](https://github.com/sethcottle/tabcloser/zipball/main)

I'm working on getting TabCloser published in the Google Chrome Web Store and Microsoft Edge Add-ons Store. I'll update the buttons above when TabCloser is approved! Right now you can manually install the latest GitHub release and upload it to Chrome or Edge yourself.

#### For Chrome
Download the latest release and unzip it. Then navigate to `chrome://extensions/` and enable "Developer mode" using the toggle in the top right corner. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

#### For Edge
Download the latest relase and unzip it. Then navigate to `edge://extensions/` and enable "Developer mode" in the left sidebar, it's near the bottom. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

## Support the Addon

[![Buy Me A Coffee](https://cdn.cottle.cloud/tabcloser/buymeacoffee.svg)](https://buymeacoffee.com/seth)

