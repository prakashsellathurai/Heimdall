import { DEFAULT_FEEDS, STORAGE_KEYS, REFRESH_INTERVAL, DEFAULT_REQUEST_INTERVAL } from '../types';
import { setInitialOption } from '../core/storage';
import { updateIfReady } from '../core/feeds';

let firstRequest = true;

function startRequest(): void {
  for (const key of Object.keys(DEFAULT_FEEDS)) {
    updateIfReady(key, firstRequest);
  }
  firstRequest = false;
  setTimeout(startRequest, REFRESH_INTERVAL);
}

setInitialOption('HN' + STORAGE_KEYS.REQUEST_INTERVAL_SUFFIX, String(DEFAULT_REQUEST_INTERVAL));
setInitialOption('LWN' + STORAGE_KEYS.REQUEST_INTERVAL_SUFFIX, String(DEFAULT_REQUEST_INTERVAL));
setInitialOption(STORAGE_KEYS.BACKGROUND_TABS, 'false');

startRequest();
