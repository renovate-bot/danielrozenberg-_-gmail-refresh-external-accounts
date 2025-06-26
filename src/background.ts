import { ALARM_NAME, ensureAlarmExists } from './background/alarms';
import {
  cleanupUnusedHiddenGmailTabs,
  getOrCreateHiddenGmailTab,
  tabIsReady,
} from './background/hidden-tabs';
import {
  getAccountHref,
  getRegisteredVisibleGmailAccounts,
  getVisibleTabIds,
  maybeUnregisterVisibleGmailTab,
  registerAccountHref,
  registerVisibleGmailTab,
} from './background/session-storage';
import { HOST_PERMISSION } from './common/host-permission';
import { assertNotNull } from './common/type-safety';

import type { Browser, Runtime } from 'webextension-polyfill';

declare const browser: Browser;

browser.runtime.onInstalled.addListener(async () => {
  if (!(await browser.permissions.contains(HOST_PERMISSION))) {
    await browser.tabs.create({
      active: true,
      url: browser.runtime.getURL('welcome.html'),
    });
  }
});

browser.alarms.onAlarm.addListener(async ({ name }) => {
  if (name !== ALARM_NAME) {
    console.error('Unknown alarm:', name);
    return;
  }

  await cleanupUnusedHiddenGmailTabs();
  for (const account of await getRegisteredVisibleGmailAccounts()) {
    await triggerPop3AccountsRefresh(account, true);
  }
});

browser.runtime.onMessage.addListener(
  async (_message: unknown, sender: Runtime.MessageSender) => {
    const isHiddenTab = sender.tab?.hidden ?? false;
    const message = _message as MessageToBackground;
    switch (message.action) {
      case 'registerVisibleGmailTab':
        if (isHiddenTab) return;
        await ensureAlarmExists();
        await registerAccountHref(message.account, message.href);
        await registerVisibleGmailTab(
          assertNotNull(sender.tab?.id),
          message.account,
        );
        return;

      case 'requestBackgroundRefresh':
        if (isHiddenTab) return;
        return triggerPop3AccountsRefresh(message.account, false);

      case 'updateRefreshStatus':
        if (!isHiddenTab) return;
        return updateRefreshStatus(message);

      default:
        console.error('Unknown message:', message);
        break;
    }
  },
);

browser.tabs.onRemoved.addListener(async (tabId) => {
  await maybeUnregisterVisibleGmailTab(tabId);
});

async function triggerPop3AccountsRefresh(account: string, silent: boolean) {
  console.log('Triggering POP3 accounts refresh for account', account);

  const accountHref = assertNotNull(await getAccountHref(account));
  const tab = await getOrCreateHiddenGmailTab(accountHref);
  const tabId = assertNotNull(tab.id);
  const isReady = await tabIsReady(tab);
  if (!isReady) {
    console.warn('Tab', tabId, 'did not load in time, skipping.');
    return;
  }

  console.log('Sending POP3 refresh message to hidden GMail tab', tabId);
  const message: MessageToContent = {
    action: 'triggerPop3AccountsRefresh',
    silent,
  };
  await browser.tabs.sendMessage(tabId, message);
}

async function updateRefreshStatus(message: UpdateRefreshStatusMessage) {
  const { account } = message;
  console.log(
    'Updating refresh status:',
    'failed' in message
      ? '(failed)'
      : `pending/completed: ${message.pending.toFixed()}/${message.completed.toFixed()}`,
  );

  const visibleTabIds = await getVisibleTabIds(account);
  for (const tabId of visibleTabIds) {
    await browser.tabs.sendMessage(tabId, message);
  }
}
