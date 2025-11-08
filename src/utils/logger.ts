import { Platform } from 'react-native';

let crashlytics: any = null;
let crashlyticsInit = false;

try {
  // Try Firebase Crashlytics
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  crashlytics = require('@react-native-firebase/crashlytics').default;
  crashlyticsInit = true;
  console.info('[logger] Firebase Crashlytics loaded');
} catch (e) {
  crashlytics = null;
  console.info('[logger] Firebase Crashlytics not available, using console fallback');
}

export function initSentry(dsn?: string) {
  // For backwards compatibility, keep the function name but use Crashlytics
  if (crashlyticsInit && crashlytics) {
    try {
      // Crashlytics doesn't need explicit init, it's automatic
      // But we can enable/disable collection
      crashlytics().setCrashlyticsCollectionEnabled(true);
      console.info('[logger] Firebase Crashlytics initialized');
    } catch (err) {
      console.warn('[logger] Error initializing Crashlytics', err);
    }
  }
}

export function captureException(err: any, ctx?: any) {
  if (crashlyticsInit && crashlytics) {
    try {
      // Log context attributes
      if (ctx) {
        Object.keys(ctx).forEach(key => {
          crashlytics().setAttribute(key, String(ctx[key]));
        });
      }
      // Record the error
      crashlytics().recordError(err);
    } catch (e) {
      console.error('[logger] captureException failed', e);
    }
  }
  console.error(err);
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (crashlyticsInit && crashlytics) {
    try {
      // Crashlytics log function for breadcrumbs
      crashlytics().log(msg);
    } catch (e) {
      console.warn('[logger] captureMessage failed', e);
    }
  }
  if (level === 'error') console.error(msg);
  else if (level === 'warning') console.warn(msg);
  else console.log(msg);
}

export default {
  initSentry,
  captureException,
  captureMessage,
};
