import { sleep } from '../common/sleep';
import { assertNotNull } from '../common/type-safety';
import {
  getAllAccountsHrefs,
  getRegisteredVisibleGmailAccounts,
} from './session-storage';

import type { Browser, Tabs } from 'webextension-polyfill';

declare const browser: Browser;

const SETTINGS_HASH = '#settings/accounts';

async function tabReportsInitialized(tabId: number) {
  const message: MessageToContent = {
    action: 'hiddenTabIsInitialized',
  };

  try {
    await browser.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    return false;
  }
}

export async function getOrCreateHiddenGmailTab(accountHref: string) {
  const hiddenTabs = await browser.tabs.query({
    url: accountHref,
    hidden: true,
  });

  for (const tab of hiddenTabs) {
    if (tab.url?.endsWith(SETTINGS_HASH)) {
      return tab;
    }
  }

  console.info('Creating hidden settings tab for href', accountHref);
  const hiddenTab = await browser.tabs.create({
    url: accountHref + SETTINGS_HASH,
    active: false,
    muted: true,
  });
  await browser.tabs.hide(assertNotNull(hiddenTab.id));

  return hiddenTab;
}

export async function cleanupUnusedHiddenGmailTabs() {
  const expectedAccounts = await getRegisteredVisibleGmailAccounts();
  const allHiddenSettingsHrefs = await getAllAccountsHrefs();

  for (const account of expectedAccounts) {
    allHiddenSettingsHrefs.delete(account);
  }

  if (allHiddenSettingsHrefs.size === 0) {
    return;
  }

  console.info('Found unused hidden settings tabs. Cleaning them up…');
  for (const settingsHref of allHiddenSettingsHrefs.values()) {
    const hiddenTabs = await browser.tabs.query({
      url: settingsHref,
      hidden: true,
    });
    for (const tab of hiddenTabs) {
      const tabId = assertNotNull(tab.id);
      console.info('Closing tab', tabId, 'with URL', settingsHref);
      await browser.tabs.remove(tabId);
    }
  }
}

export async function tabIsReady(tab: Tabs.Tab) {
  const tabId = assertNotNull(tab.id);

  let attemptsLeft = 15;
  while (
    attemptsLeft-- > 0 &&
    tab.status !== 'complete' &&
    !(await tabReportsInitialized(tabId))
  ) {
    await sleep(1_000);
  }

  return attemptsLeft > 0;
}
