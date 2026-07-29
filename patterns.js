// Copyright (C) 2023-2026 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

// Single source of truth for TabCloser's URL patterns, shared by every context:
//   - Chrome/Safari background service worker: importScripts('patterns.js') in background.js
//   - Firefox background event page: listed before background.js in manifest background.scripts
//   - Options page and popup: <script src="patterns.js"> before options.js
//
// The enable/disable toggles are stored as the exact pattern string, so whenever
// a pattern here is edited, its previous form MUST be added to legacyPatternMap
// below — otherwise the rule silently re-enables for users who had it toggled off.

// Display metadata for service groups (entries sharing a `group` value below)
const groupMeta = {
  Figma: { icon: 'figma.svg' },
};

const predefinedUrlPatterns = [
  { label: 'Asana', pattern: '^https?://app\\.asana\\.com/-/desktop_app_link\\?.*', icon: 'asana.svg' },
  { label: 'AWS IAM Access Auth Success', pattern: '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success\\.html', icon: 'aws-iam.svg' },
  { label: 'Discord Invites', pattern: '^https?://discord\\.com/invite/', icon: 'discord.svg',
    note: 'Closes discord.com/invite pages. If you accept invites in the browser instead of the Discord app, leave this off.' },
  { label: 'Figma Buzz', pattern: '^https?://(?:www\\.)?figma\\.com/buzz/', icon: 'figma-buzz.svg', group: 'Figma' },
  { label: 'Figma Design Files', pattern: '^https?://(?:www\\.)?figma\\.com/design/', icon: 'figma-design.svg', group: 'Figma' },
  { label: 'Figma Make', pattern: '^https?://(?:www\\.)?figma\\.com/make/', icon: 'figma-make.svg', group: 'Figma' },
  { label: 'Figma Sites', pattern: '^https?://(?:www\\.)?figma\\.com/site/', icon: 'figma-sites.svg', group: 'Figma' },
  { label: 'Figma Slide Files', pattern: '^https?://(?:www\\.)?figma\\.com/slides/', icon: 'figma-slides.svg', group: 'Figma' },
  { label: 'Figjam Files', pattern: '^https?://(?:www\\.)?figma\\.com/board/', icon: 'figma-figjam.svg', group: 'Figma' },
  { label: 'Linear', pattern: '^https?://linear\\.app/(?!integrations(/|$)|settings(/|$)).*\\?noRedirect=1$', icon: 'linear.svg' },
  { label: 'Microsoft Teams', pattern: '^https?://teams\\.microsoft\\.com/dl/launcher/.*', icon: 'teams.svg' },
  { label: 'Notion', pattern: '^https?://www\\.notion\\.so/native/.*&deepLinkOpenNewTab=true', icon: 'notion.svg' },
  { label: 'Slack', pattern: '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|files\\.slack\\.com|.*\\/(admin|customize|account|apps|marketplace|files|files-pri)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.(enterprise\\.)?slack\\.com/', icon: 'slack.svg' },
  { label: 'Spotify', pattern: '^https?://open\\.spotify\\.com', icon: 'spotify.svg',
    note: 'Closes all open.spotify.com pages. If you listen in the Spotify web player, leave this off.' },
  { label: 'VS Code Live Share', pattern: '^https?://vscode\\.dev/liveshare', icon: 'code.svg' },
  { label: 'Webex Joins', pattern: '^https?://([a-z0-9-]+\\.)?webex\\.com/wbxmjs/joinservice', icon: 'webex.svg' },
  { label: 'Zoom Joins', pattern: '^https?://([a-z0-9-]+\\.)?zoom\\.us/[js]/[^/]+.*#success$', icon: 'zoom.svg' },
];

// Old forms of predefined patterns, mapped to their current forms. Used to
// rewrite stored toggle state on update (background.js) and when importing a
// settings file exported by an older version (options.js).
const legacyPatternMap = {
  // 4.x Figma patterns: '\.' inside a single-quoted string collapses to '.',
  // so the shipped regexes had unescaped dots (fixed in 5.0)
  '^https?://(?:www.)?figma.com/buzz/': '^https?://(?:www\\.)?figma\\.com/buzz/',
  '^https?://(?:www.)?figma.com/design/': '^https?://(?:www\\.)?figma\\.com/design/',
  '^https?://(?:www.)?figma.com/make/': '^https?://(?:www\\.)?figma\\.com/make/',
  '^https?://(?:www.)?figma.com/site/': '^https?://(?:www\\.)?figma\\.com/site/',
  '^https?://(?:www.)?figma.com/slides/': '^https?://(?:www\\.)?figma\\.com/slides/',
  '^https?://(?:www.)?figma.com/board/': '^https?://(?:www\\.)?figma\\.com/board/',
  // 4.x AWS pattern, before the login-success.html dot was escaped
  '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success.html':
    '^https://[a-z0-9-]+\\.awsapps\\.com/start/user-consent/login-success\\.html',
  // 4.3.0 Slack pattern, before files.slack.com / file paths were excluded (#18)
  '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|.*\\/(admin|customize|account|apps|marketplace)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.(enterprise\\.)?slack\\.com/':
    '^https?://(?!(app\\.slack\\.com|slack\\.com|api\\.slack\\.com|files\\.slack\\.com|.*\\/(admin|customize|account|apps|marketplace|files|files-pri)(\\/|$)|.*\\/home(\\/|$)))[a-z0-9-]+\\.(enterprise\\.)?slack\\.com/',
};
