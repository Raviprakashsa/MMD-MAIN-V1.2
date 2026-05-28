import { initSentry } from './sentry'

// Ensure SENTRY_RELEASE is set (CI will set this to GITHUB_SHA)
if (!process.env.SENTRY_RELEASE && process.env.GITHUB_SHA) {
	process.env.SENTRY_RELEASE = process.env.GITHUB_SHA
}

// Initialize Sentry if DSN exists. Export nothing; side-effect module.
initSentry(process.env.SENTRY_DSN)
