/**
 * Storage scheme:
 * - `accountHref:<account>`: Stores the URL for the given GMail account.
 * - `visibleGmailTab:<tabId>`: Maps a visible GMail tab to the account it is showing.
 */

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

export async function registerAccountHref(account: string, href: string) {
  console.log('Registering account', account, 'with href', href);
  await browser.storage.session.set({
    [accountHrefStorageKey(account)]: href,
  });
}

export async function getAccountHref(account: string) {
  const key = accountHrefStorageKey(account);
  const storage = await browser.storage.session.get(key);
  return storage[key] as string | undefined;
}

export async function getAllAccountsHrefs() {
  const storage = await browser.storage.session.get();
  const accountHrefs = new Map<string, string>();
  for (const key in storage) {
    if (!key.startsWith('accountHref:')) {
      continue;
    }

    const account = key.slice('accountHref:'.length);
    accountHrefs.set(account, storage[key] as string);
  }
  return accountHrefs;
}

export async function registerVisibleGmailTab(tabId: number, account: string) {
  console.log('Registering visible GMail tab', tabId, 'for account', account);
  await browser.storage.session.set({
    [visibleTabStorageKey(tabId)]: account,
  });
}

export async function getRegisteredVisibleGmailAccounts() {
  const storage = await browser.storage.session.get();
  const accounts = new Set<string>();
  for (const key in storage) {
    if (!key.startsWith('visibleGmailTab:')) {
      continue;
    }

    accounts.add(storage[key] as string);
  }
  return accounts;
}

export async function getVisibleTabIds(account: string) {
  const storage = await browser.storage.session.get();
  const tabIds = [];
  for (const key in storage) {
    if (!key.startsWith('visibleGmailTab:') || storage[key] !== account) {
      continue;
    }

    tabIds.push(parseInt(key.slice('visibleGmailTab:'.length), 10));
  }
  return tabIds;
}

export async function maybeUnregisterVisibleGmailTab(tabId: number) {
  const key = visibleTabStorageKey(tabId);
  if (key in (await browser.storage.session.get(key))) {
    console.log('Unregistering visible GMail tab', tabId);
    return browser.storage.session.remove(key);
  }
}

function visibleTabStorageKey(tabId: number) {
  return `visibleGmailTab:${tabId.toFixed()}`;
}

function accountHrefStorageKey(account: string) {
  return `accountHref:${account}`;
}
