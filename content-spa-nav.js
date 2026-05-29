// Copyright (C) 2023-2026 Seth Cottle

// This file is part of TabCloser.

// TabCloser is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or any later version.

// TabCloser is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. Please see the
// GNU General Public License for more details.

// Safari single-page-app navigation shim.
//
// Some services (e.g. Linear) reach their final, closable URL via a client-side
// route change rather than a full document load — for Linear, landing the tab on
// `...?noRedirect=1` after the desktop-app handoff. In Safari, tabs.onUpdated does
// not reliably fire for these in-page History API navigations, and Safari does not
// support webNavigation.onHistoryStateUpdated. As a result the background script
// never sees the final URL, so the predefined pattern never gets a chance to match
// and the leftover tab is never closed.
//
// Content scripts run in an isolated world, so patching the page's
// history.pushState/replaceState from here is unreliable (it only affects this
// script's copy). Instead we observe location.href — which always reflects the page's
// real URL — and report changes to the background script, which then runs its normal
// scheduleClose() matching logic. This script only runs on the hosts TabCloser already
// targets, so it does nothing on unrelated pages.

(function () {
  const api = typeof browser !== 'undefined' ? browser : chrome;

  let lastReported = null;

  function report() {
    const url = location.href;
    if (url === lastReported) return;
    lastReported = url;
    try {
      api.runtime.sendMessage({ type: 'tabcloser:url', url });
    } catch (error) {
      // Background may be inactive; harmless — the next change will retry.
    }
  }

  // Back/forward and hash changes fire on window in the isolated world.
  window.addEventListener('popstate', report);
  window.addEventListener('hashchange', report);

  // Poll location.href to catch pushState/replaceState route changes the events miss.
  setInterval(report, 500);

  // Report the initial URL in case the redirect completed before injection.
  report();
})();
