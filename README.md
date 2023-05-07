<img src="https://cdn.cottle.cloud/tabcloser/tabcloser.svg" width="150">

# TabCloser

## What is TabCloser?
Tabcloser is an extension for Chromium browsers that periodically checks for commonly redirected tabs for <b>Figma</b> files, joining <b>Zoom</b> meetings, opening <b>Spotify</b> links, <b>VS Code Live Share</b> invitations, and <b>Discord</b> invites

![Tabs](https://cdn.cottle.cloud/tabcloser/tabs.svg)

## TabCloser Options

By default, Figma, Zoom, Spotify, VS Code Live Share, and Discord invites are enabled. Just deselect any service that you don't want tabs to close for automatically.

![TabCloser Options](https://cdn.cottle.cloud/tabcloser/options.svg)

Let's breakdown how TabCloser decides if it should close a tab. TabCloser is looking for a partial match on a dedicated URL for each service.

#### Figma
For Figma, TabCloser is looking for `figma.com/file/`. When you're sent a Figma link, ones that contain `/file/` is what is redirected to the Figma desktop client. TabCloser <b>will not</b> close `/files/` which is the logged in homepage and <b>will not</b> close tabs for Figma Community profiles, files, plugins, ..etc.

#### Zoom
For Zoom, TabCloser is looking for `zoom.us/j/`. The `/j/` is a join meeting link, which can be opened in the Zoom desktop client.

#### Spotify
For Spotify, TabCloser is looking for `open.spotify.com`. The `open.` is typically associated with opening a song, artist, playlist, ..etc which can be opened in the Spotify desktop client.

#### VS Code Live Share
For Live Share, TabCloser is looking for `vscode.dev/liveshare/`. The `/liveshare/` is associated with the Live Share URL which can be opened in the VS Code desktop client.

#### Discord
For Discord, TabCloser is looking for `discord.com/invite/`. The `/invite/` is associated with a Discord invite which can be opened in the Discord desktop client.

## Requested Permissions
TabCloser requests a few permissions in the `manifest.json` file.

`chrome.tabs` allows TabCloser to interact with Figma, Join Zoom, Spotify, VS Code Live Share, and Discord Invite tabs.

`chrome.storage` allows TabCloser to save if you have `enabled` or `disabled` the auto close option for a particular service in the options menu.

`chrome.alarms` lets us periodically run TabCloser. TabCloser isn't <b>constantly</b> scanning your tabs, every 30 seconds TabCloser will do a tab scan to see if there are any relevant tabs, it'll close tabs within 15 seconds of that check.

## Installing TabCloser

![Google Chrome](https://cdn.cottle.cloud/tabcloser/chrome-soon.svg)
![Microsoft Edge](https://cdn.cottle.cloud/tabcloser/edge-soon.svg)
[![Latest GitHub Release](https://cdn.cottle.cloud/tabcloser/download.svg)](https://github.com/sethcottle/tabcloser/zipball/main)

I'm working on getting TabCloser published in the Google Chrome Web Store and Microsoft Edge Add-ons Store. I'll update the buttons above when TabCloser is approved! Right now you can manually installed the latest GitHub release and upload it to Chrome or Edge yourself.

#### For Chrome
Download the latest release and unzip it. Then navigate to `chrome://extensions/` and enable "Developer mode" using the toggle in the top right corner. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.

#### For Edge
Download the latest relase and unzip it. Then navigate to `edge://extensions/` and enable "Developer mode" in the left sidebar, it's near the bottom. Upload the extension manually by pressing "Load unpacked" and selecting the unzipped TabCloser folder.
