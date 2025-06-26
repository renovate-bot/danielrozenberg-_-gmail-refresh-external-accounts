import { $$ } from '../document/helper';
import { asyncGmailAccountName, gmailAccountName } from './common';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

const REFRESH_LINK_SELECTOR = '.rP.sA';
const REFRESHING_SPAN_SELECTOR = '.cf.qv .CY .rP:last-of-type:not(.sA)';

const FAILURE_TIMEOUT_MS = 8_000;
const CLEANUP_TIMEOUT_MS = 3_000;

let timeoutId = 0;
let isSilent = false;
let initialized = false;

function setFailureTimeout() {
  maybeClearTimeout();

  if (isSilent) {
    return;
  }

  timeoutId = window.setTimeout(async () => {
    await sendFailedStatus();
  }, FAILURE_TIMEOUT_MS);
}

async function setCleanupTimeout() {
  maybeClearTimeout();

  if (isSilent) {
    await sendCleanupStatus();
  } else {
    timeoutId = window.setTimeout(async () => {
      await sendCleanupStatus();
    }, CLEANUP_TIMEOUT_MS);
  }

  isSilent = true;
}

function maybeClearTimeout() {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}

async function sendUpdate(numPending: number, numCompleted: number) {
  if (isSilent) {
    return;
  }
  console.log(
    `Sending refresh status update (pending/completed: ${numPending.toFixed()}/${numCompleted.toFixed()})`,
  );

  if (numPending > 0) {
    setFailureTimeout();
  } else {
    await setCleanupTimeout();
  }

  const message: MessageToBackground = {
    action: 'updateRefreshStatus',
    account: gmailAccountName(),
    pending: numPending,
    completed: numCompleted,
  };
  await browser.runtime.sendMessage(message);
}

async function sendCleanupStatus() {
  maybeClearTimeout();
  console.log('Sending status update cleanup');

  const message: MessageToBackground = {
    action: 'updateRefreshStatus',
    account: gmailAccountName(),
    pending: 0,
    completed: 0,
  };
  await browser.runtime.sendMessage(message);
}

async function sendFailedStatus() {
  maybeClearTimeout();

  console.warn(
    'Update refresh status task timed out after',
    FAILURE_TIMEOUT_MS,
    'ms',
  );
  const message: MessageToBackground = {
    action: 'updateRefreshStatus',
    account: gmailAccountName(),
    failed: true,
  };
  await browser.runtime.sendMessage(message);

  await setCleanupTimeout();
}

export async function clickRefreshLinks(silent: boolean) {
  console.log(
    'Refreshing POP3 accounts',
    silent ? '(silent)' : '(with updates)',
  );
  isSilent = silent;

  const refreshLinks = $$(REFRESH_LINK_SELECTOR);

  if (isSilent) {
    await sendCleanupStatus();
  } else {
    await sendUpdate(refreshLinks.length, 0);
  }

  for (const refreshLink of refreshLinks) {
    refreshLink.click();
  }
}

export async function initHiddenTab() {
  await asyncGmailAccountName();

  const observer = new MutationObserver(async () => {
    if (!isSilent) {
      const numRefreshLinks = $$(REFRESH_LINK_SELECTOR).length;
      const numRefreshingSpans = $$(REFRESHING_SPAN_SELECTOR).length;
      await sendUpdate(numRefreshLinks, numRefreshingSpans);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  initialized = true;
}

export function hiddenTabIsReady() {
  return initialized;
}
