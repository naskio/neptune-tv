/** Versioned persist namespace — bump and add `migrate` when persisted shape changes. */
export const PERSIST_VERSION = 1 as const;
export const SETTINGS_STORAGE_KEY = `neptune:v${PERSIST_VERSION}:settings`;
