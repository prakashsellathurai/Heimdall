import { updateIfReady } from '../core/feeds';
import { setInitialOption } from '../core/storage';
import { DEFAULT_FEEDS, DEFAULT_REQUEST_INTERVAL, REFRESH_INTERVAL, STORAGE_KEYS } from '../types';

let firstRequest = true;

function startRequest(): void {
  for (const key of Object.keys(DEFAULT_FEEDS)) {
    updateIfReady(key, firstRequest);
  }
  firstRequest = false;
  setTimeout(startRequest, REFRESH_INTERVAL);
}

setInitialOption(`HN${STORAGE_KEYS.REQUEST_INTERVAL_SUFFIX}`, String(DEFAULT_REQUEST_INTERVAL));
setInitialOption(`LWN${STORAGE_KEYS.REQUEST_INTERVAL_SUFFIX}`, String(DEFAULT_REQUEST_INTERVAL));
setInitialOption(STORAGE_KEYS.BACKGROUND_TABS, 'false');

startRequest();
