import { sleep } from '../common/sleep';
import { assertNotNull } from '../common/type-safety';
import { $ } from '../document/helper';

export async function asyncGmailAccountName() {
  let attemptsLeft = 60;
  while (attemptsLeft--) {
    try {
      return gmailAccountName();
    } catch {
      await sleep(1_000);
    }
  }
  throw new Error('GMail failed to load within 60 seconds');
}

export function gmailAccountName() {
  return assertNotNull(
    $('meta[name="og-profile-acct"]').getAttribute('content'),
  );
}
