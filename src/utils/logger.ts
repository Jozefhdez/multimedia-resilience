import * as Sentry from '@sentry/react-native';

// Sentry ya está inicializado en App.tsx por el wizard

export function initSentry(dsn?: string) {
  // Ya no es necesario inicializar aquí, el wizard lo hace en App.tsx
  console.info('[logger] Sentry initialized by wizard in App.tsx');
}

export function captureException(err: any, ctx?: any) {
  try {
    Sentry.captureException(err, { extra: ctx });
  } catch (e) {
    console.error('[logger] captureException failed', e);
  }
  console.error(err);
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  try {
    Sentry.captureMessage(msg, level as Sentry.SeverityLevel);
  } catch (e) {
    console.warn('[logger] captureMessage failed', e);
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
