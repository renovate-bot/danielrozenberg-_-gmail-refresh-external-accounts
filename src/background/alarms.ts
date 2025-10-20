import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

export const ALARM_NAME = 'refreshPop3Accounts';
const ALARM_INITIAL_DELAY = 800;

export async function ensureAlarmExists() {
  const existingAlarm = await browser.alarms.get(ALARM_NAME);
  if (existingAlarm) {
    return;
  }

  console.log('Initializing auto-refresh');
  await browser.alarms.create(ALARM_NAME, {
    when: Date.now() + ALARM_INITIAL_DELAY,
    periodInMinutes: 1,
  });
}
