import { assertNotNull } from '../common/type-safety';
import { $$ } from '../document/helper';
import { asyncGmailAccountName, gmailAccountName } from './common';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

const REFRESH_BUTTON_SELECTOR = '.T-I.J-J5-Ji.nu.T-I-ax7.L3';
const REFRESH_BUTTON_CSS = `.T-I.J-J5-Ji.nu.T-I-ax7.L3::after {
  content: attr(data-external-refresh-status);
  font-size: 5px;
  position: absolute;
  inset-block-end: -10px;
  inset-inline-end: 0;
}`;

export function augmentRefreshButton() {
  for (const refreshButton of $$(REFRESH_BUTTON_SELECTOR)) {
    refreshButton.addEventListener('click', requestBackgroundRefresh);
  }
}

async function requestBackgroundRefresh() {
  const message: MessageToBackground = {
    action: 'requestBackgroundRefresh',
    account: gmailAccountName(),
  };
  await browser.runtime.sendMessage(message);
}

export function updateRefreshStatus(message: UpdateRefreshStatusMessage) {
  const externalRefreshStatus =
    'failed' in message
      ? '🔴'
      : '🟠'.repeat(message.pending) + '🟢'.repeat(message.completed);
  console.log('Updating refresh status:', externalRefreshStatus);

  for (const refreshButton of $$(REFRESH_BUTTON_SELECTOR)) {
    refreshButton.setAttribute(
      'data-external-refresh-status',
      externalRefreshStatus,
    );
  }
}

export async function initVisibleTabs() {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('type', 'text/css');
  styleElement.textContent = REFRESH_BUTTON_CSS;
  document.head.appendChild(styleElement);

  const observer = new MutationObserver(() => {
    augmentRefreshButton();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  augmentRefreshButton();

  const message: MessageToBackground = {
    action: 'registerVisibleGmailTab',
    account: await asyncGmailAccountName(),
    href: assertNotNull(window.location.href).replace(/#.*$/, ''),
  };
  await browser.runtime.sendMessage(message);
}
