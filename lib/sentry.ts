// Optional Sentry bootstrap. Import and call `initSentry` early in server startup
export function initSentry(dsn?: string) {
  if (!dsn) return null
  try {
    // Dynamically require to avoid adding runtime error if package missing
    const Sentry = require('@sentry/node')
    const release = process.env.SENTRY_RELEASE || process.env.GITHUB_SHA
    const environment = process.env.NODE_ENV || 'production'
    Sentry.init({
      dsn,
      tracesSampleRate: 0.05,
      release,
      environment,
    })
    return Sentry
  } catch (err) {
    // Sentry not installed; skip and log the error for diagnostics
    // console usage is intentional for diagnostics during bootstrap
    console.warn('Sentry not installed or failed to init, skipping', err)
    return null
  }
}
