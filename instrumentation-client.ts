import * as Sentry from '@sentry/nextjs'

// No-ops entirely until NEXT_PUBLIC_SENTRY_DSN is set — safe to ship as-is,
// nothing sends anywhere until you create a Sentry project and add the DSN
// to your env. When you do, this is the client-side half of the setup.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Adjust down once you have real traffic — 100% is fine at low volume.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
