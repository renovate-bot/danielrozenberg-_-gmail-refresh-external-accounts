import {
  clickRefreshLinks,
  hiddenTabIsReady,
  initHiddenTab,
} from './content/hidden-tabs';
import { initVisibleTabs, updateRefreshStatus } from './content/visible-tabs';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

// Message listener for the hidden tab to refresh POP3 accounts.
browser.runtime.onMessage.addListener(async (_message: unknown) => {
  const message = _message as MessageToContent;

  switch (message.action) {
    case 'hiddenTabIsInitialized':
      // Expected only in hidden tabs.
      return hiddenTabIsReady();

    case 'triggerPop3AccountsRefresh':
      // Expected only in hidden tabs.
      await clickRefreshLinks(message.silent);
      return;

    case 'updateRefreshStatus':
      // Expected only in visible tabs.
      updateRefreshStatus(message);
      return;

    default:
      console.warn('Unknown message:', message);
      return;
  }
});

void (async () => {
  console.log('Initializing `GMail — Refresh External Accounts` extension');

  await initVisibleTabs();
  await initHiddenTab();
})();
