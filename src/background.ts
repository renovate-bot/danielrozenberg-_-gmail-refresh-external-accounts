import type { Browser, Runtime } from 'webextension-polyfill';

import { ALARM_INITIAL_DELAY, ALARM_NAME } from './common/alarms';
import { HOST_PERMISSION } from './common/host-permission';

declare const browser: Browser;

const SETTINGS_HASH = '#settings/accounts';

browser.runtime.onInstalled.addListener(async () => {
  if (!(await browser.permissions.contains(HOST_PERMISSION))) {
    await browser.tabs.create({
      active: true,
      url: browser.runtime.getURL('welcome.html'),
    });
  }
});

browser.alarms.onAlarm.addListener(async ({ name }) => {
  if (name === ALARM_NAME) {
    await refreshPop3Accounts();
  }
});

browser.runtime.onMessage.addListener(
  async (_message: unknown, sender: Runtime.MessageSender) => {
    if (sender.tab?.hidden) {
      return;
    }

    const message = _message as Payload;
    switch (message.action) {
      case 'initializeAutoRefresh':
        return initializeAutoRefresh();

      case 'refreshPop3Accounts':
        return refreshPop3Accounts();

      default:
        console.error('Unknown message:', message);
        break;
    }
  },
);

async function initializeAutoRefresh() {
  const existingAlarm = await browser.alarms.get(ALARM_NAME);
  if (existingAlarm) {
    return;
  }

  console.log('Initializing auto-refresh');
  browser.alarms.create(ALARM_NAME, {
    when: Date.now() + ALARM_INITIAL_DELAY,
    periodInMinutes: 1,
  });
}

async function refreshPop3Accounts() {
  console.log('Refreshing POP3 accounts');

  const gmailHrefs = await getVisibleGmailTabHrefs();
  const hiddenGmailTabIds = await getOrCreateHiddenGmailTabIds(gmailHrefs);
  void cleanupUnusedHiddenGmailTabs(hiddenGmailTabIds);

  for (const hiddenGmailTabId of hiddenGmailTabIds) {
    const tab = await browser.tabs.get(hiddenGmailTabId);

    let attemptsLeft = 15;
    while (tab.status !== 'complete' && attemptsLeft > 0) {
      await sleep(1_000);
      attemptsLeft--;
    }

    if (tab.status !== 'complete') {
      console.warn('Tab', hiddenGmailTabId, 'did not load in time, skipping.');
      continue;
    }

    console.log(
      'Sending POP3 refresh message to hidden GMail tab',
      hiddenGmailTabId,
    );
    const message: RefreshPop3AccountsPayload = {
      action: 'refreshPop3Accounts',
    };
    void browser.tabs.sendMessage(hiddenGmailTabId, message);
  }
}

async function getVisibleGmailTabHrefs() {
  const visibleGmailTabs = await browser.tabs.query({
    url: 'https://mail.google.com/mail/*',
    hidden: false,
  });
  const gmailHrefs = new Set<string>();
  for (const tab of visibleGmailTabs) {
    gmailHrefs.add(removeHash(tab.url));
  }
  return gmailHrefs;
}

async function getOrCreateHiddenGmailTabIds(gmailHrefs: Set<string>) {
  const hiddenGmailTabIds: number[] = [];

  for (const gmailHref of gmailHrefs) {
    const existingHiddenGmailTabs = await browser.tabs.query({
      url: gmailHref,
      hidden: true,
    });

    if (existingHiddenGmailTabs.length) {
      hiddenGmailTabIds.push(assertNotNull(existingHiddenGmailTabs[0].id));
      continue;
    }

    console.info('Creating hidden GMail tab for', gmailHref);
    const { id } = await browser.tabs.create({
      url: gmailHref + SETTINGS_HASH,
      active: false,
      muted: true,
    });

    const newTabId = assertNotNull(id);
    console.info('Hidden GMail tab created with ID', newTabId);
    await browser.tabs.hide(newTabId);
    hiddenGmailTabIds.push(newTabId);
  }

  return hiddenGmailTabIds;
}

async function cleanupUnusedHiddenGmailTabs(usedHiddenGmailTabIds: number[]) {
  const allHiddenGmailTabs = await browser.tabs.query({
    url: 'https://mail.google.com/mail/*',
    hidden: true,
  });

  for (const tab of allHiddenGmailTabs) {
    const tabId = assertNotNull(tab.id);
    if (usedHiddenGmailTabIds.includes(assertNotNull(tabId))) {
      continue;
    }

    const tabUrl = assertNotNull(tab.url);
    console.info('Removing unused hidden GMail tab', tabId, 'with URL', tabUrl);
    await browser.tabs.remove(tabId);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeHash(url: string | undefined) {
  return assertNotNull(url).replace(/#.*$/, '');
}

function assertNotNull<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) {
    throw new TypeError('Value is undefined or null');
  }
  return value;
}
