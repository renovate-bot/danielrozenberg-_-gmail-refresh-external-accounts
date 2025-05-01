import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

const REFRESH_BUTTON_SELECTOR = '.T-I.J-J5-Ji.nu.T-I-ax7.L3';
const REFRESH_LINK_SELECTOR = '.rP.sA';
const INBOX_PAGE_HASH = '#inbox';

function augmentRefreshButton() {
  if (location.hash !== INBOX_PAGE_HASH) {
    return;
  }

  const refreshButton = document.querySelector<HTMLElement>(
    REFRESH_BUTTON_SELECTOR,
  );
  refreshButton?.addEventListener('click', refreshPop3Accounts);
}

async function refreshPop3Accounts() {
  const message: RefreshPop3AccountsPayload = {
    action: 'refreshPop3Accounts',
  };
  await browser.runtime.sendMessage(message);
}

// Message listener for the hidden tab to refresh POP3 accounts.
browser.runtime.onMessage.addListener((_message: unknown) => {
  const message = _message as Payload;

  if (message.action !== 'refreshPop3Accounts') {
    console.warn('Unknown message:', message);
    return;
  }

  console.log('Refreshing POP3 accounts');
  for (const refreshLink of document.querySelectorAll<HTMLElement>(
    REFRESH_LINK_SELECTOR,
  )) {
    refreshLink.click();
  }
});

console.log('Initializing `GMail — Refresh External Accounts` extension');
const message: InitializeAutoRefreshPayload = {
  action: 'initializeAutoRefresh',
};
void browser.runtime.sendMessage(message);

window.addEventListener('hashchange', augmentRefreshButton);
augmentRefreshButton();
