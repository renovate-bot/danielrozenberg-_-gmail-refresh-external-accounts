import type { Permissions } from 'webextension-polyfill';

export const HOST_PERMISSION: Permissions.Permissions = {
  origins: ['https://mail.google.com/*'],
};
