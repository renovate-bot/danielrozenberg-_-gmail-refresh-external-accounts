export function assertNotNull<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) {
    throw new TypeError('Value is undefined or null');
  }
  return value;
}
