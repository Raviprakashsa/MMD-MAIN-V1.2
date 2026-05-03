import { promises as fs } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

type RouteAudit = {
  route: string
  finalUrl?: string
  violationCount: number
  nodeCount: number
  violations: Array<{
    id: string
    impact: string | null
    description: string
    help: string
    helpUrl: string
    nodes: Array<{
      target: unknown
      html: string
      failureSummary?: string
    }>
  }>
  error?: string
}

type ContrastReport = {
  generatedAt: string
  baseUrl: string
  authenticated: boolean
  authError?: string
  auditedRouteCount: number
  discoveredStaticRoutes: string[]
  skippedDynamicRoutes: string[]
  routeErrors: string[]
  totalViolationRules: number
  totalViolationNodes: number
  routes: RouteAudit[]
}

const APP_DIR = path.join(process.cwd(), 'app')
const OUTPUT_DIR = path.join(process.cwd(), 'audit', 'contrast')
const REPORT_JSON = path.join(OUTPUT_DIR, 'contrast-report.json')
const REPORT_MD = path.join(OUTPUT_DIR, 'contrast-report.md')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.AUDIT_EMAIL || 'admin@magnuscopo.com'
const TEST_PASSWORD = process.env.AUDIT_PASSWORD || 'Admin123!'

async function listPageFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'api') continue
      out.push(...await listPageFiles(full))
      continue
    }

    if (entry.isFile() && entry.name === 'page.tsx') {
      out.push(full)
    }
  }

  return out
}

function pageFileToRoute(filePath: string): { route?: string; dynamic?: string } {
  const relative = path.relative(APP_DIR, filePath)
  const routeDir = path.dirname(relative)
  const rawSegments = routeDir === '.' ? [] : routeDir.split(path.sep).filter(Boolean)

  const filteredSegments = rawSegments.filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false
    if (segment.startsWith('@')) return false
    return true
  })

  const hasDynamic = filteredSegments.some((segment) => segment.startsWith('[') && segment.endsWith(']'))
  const normalized = filteredSegments.length ? `/${filteredSegments.join('/')}` : '/'

  if (hasDynamic) {
    return { dynamic: normalized }
  }

  return { route: normalized }
}

async function ensureServerUp(baseUrl: string, retries = 15): Promise<void> {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(baseUrl)
      if (res.ok || res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308 || res.status === 401) return
    } catch {
      // Ignore connection errors while waiting for server startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Server not reachable at ${baseUrl}. Start the app first (npm run dev or npm run start).`)
}

async function login(page: import('playwright').Page, baseUrl: string): Promise<{ ok: boolean; message?: string }> {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')
  const hasEmail = await emailInput.count()
  const hasPassword = await passwordInput.count()

  if (!hasEmail || !hasPassword) {
    return { ok: false, message: 'Login form not found.' }
  }

  await emailInput.first().fill(TEST_EMAIL)
  await passwordInput.first().fill(TEST_PASSWORD)

  const submitButton = page.locator('button[type="submit"]')
  if (await submitButton.count()) {
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined),
      submitButton.first().click(),
    ])
  } else {
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined)
  }

  const finalPath = new URL(page.url()).pathname
  if (finalPath === '/dashboard') {
    return { ok: true }
  }

  const errorText = await page.locator('div.text-red-700').first().textContent().catch(() => null)
  const message = errorText?.trim() || `Login did not navigate to /dashboard (stayed on ${finalPath}).`
  return { ok: false, message }
}

function markdownReport(report: ContrastReport): string {
  const lines: string[] = []
  lines.push('# WCAG 2.1 AA Contrast Audit (axe color-contrast)')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Base URL: ${report.baseUrl}`)
  lines.push(`Authenticated session: ${report.authenticated ? 'yes' : 'no'}`)
  if (report.authError) {
    lines.push(`Auth error: ${report.authError}`)
  }
  lines.push(`Audited static routes: ${report.auditedRouteCount}`)
  lines.push(`Skipped dynamic routes: ${report.skippedDynamicRoutes.length}`)
  lines.push(`Route errors: ${report.routeErrors.length}`)
  lines.push(`Total contrast violation rules: ${report.totalViolationRules}`)
  lines.push(`Total contrast violation nodes: ${report.totalViolationNodes}`)
  lines.push('')

  if (report.skippedDynamicRoutes.length) {
    lines.push('## Skipped Dynamic Routes')
    for (const route of report.skippedDynamicRoutes) {
      lines.push(`- ${route}`)
    }
    lines.push('')
  }

  if (report.routeErrors.length) {
    lines.push('## Route Errors')
    for (const error of report.routeErrors) {
      lines.push(`- ${error}`)
    }
    lines.push('')
  }

  lines.push('## Route Results')
  for (const routeResult of report.routes) {
    lines.push(`### ${routeResult.route}`)
    if (routeResult.error) {
      lines.push(`- Error: ${routeResult.error}`)
      lines.push('')
      continue
    }

    lines.push(`- Final URL: ${routeResult.finalUrl || 'n/a'}`)
    lines.push(`- Violation rules: ${routeResult.violationCount}`)
    lines.push(`- Violation nodes: ${routeResult.nodeCount}`)

    for (const violation of routeResult.violations) {
      lines.push(`  - Rule: ${violation.id} (${violation.impact || 'n/a'})`)
      lines.push(`  - Help: ${violation.help}`)
      lines.push(`  - URL: ${violation.helpUrl}`)
      lines.push(`  - Nodes: ${violation.nodes.length}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  await ensureServerUp(BASE_URL)

  const pageFiles = await listPageFiles(APP_DIR)
  const staticRoutes = new Set<string>()
  const dynamicRoutes = new Set<string>()

  for (const pageFile of pageFiles) {
    const mapped = pageFileToRoute(pageFile)
    if (mapped.route) staticRoutes.add(mapped.route)
    if (mapped.dynamic) dynamicRoutes.add(mapped.dynamic)
  }

  const routes = Array.from(staticRoutes).sort((a, b) => a.localeCompare(b))
  const routeResults: RouteAudit[] = []
  const routeErrors: string[] = []

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const authStatus = { ok: false, message: 'Login was not attempted.' }

  try {
    const loginResult = await login(page, BASE_URL)
    authStatus.ok = loginResult.ok
    authStatus.message = loginResult.message || ''

    for (const route of routes) {
      const url = `${BASE_URL}${route}`
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
        const finalUrl = page.url()
        const finalPath = new URL(finalUrl).pathname

        if (finalPath === '/login' && route !== '/login' && route !== '/') {
          const message = `Redirected to /login while auditing ${route}.`
          routeErrors.push(message)
          routeResults.push({
            route,
            finalUrl,
            violationCount: 0,
            nodeCount: 0,
            violations: [],
            error: message,
          })
          continue
        }

        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2aa'])
          .withRules(['color-contrast'])
          .analyze()

        const violations = axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact || null,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map((node) => ({
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
          })),
        }))

        const nodeCount = violations.reduce((sum, item) => sum + item.nodes.length, 0)

        routeResults.push({
          route,
          finalUrl,
          violationCount: violations.length,
          nodeCount,
          violations,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        routeErrors.push(`${route}: ${message}`)
        routeResults.push({
          route,
          violationCount: 0,
          nodeCount: 0,
          violations: [],
          error: message,
        })
      }
    }
  } finally {
    await context.close()
    await browser.close()
  }

  const totalViolationRules = routeResults.reduce((sum, r) => sum + r.violationCount, 0)
  const totalViolationNodes = routeResults.reduce((sum, r) => sum + r.nodeCount, 0)

  const report: ContrastReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    authenticated: authStatus.ok,
    authError: authStatus.ok ? undefined : authStatus.message,
    auditedRouteCount: routes.length,
    discoveredStaticRoutes: routes,
    skippedDynamicRoutes: Array.from(dynamicRoutes).sort((a, b) => a.localeCompare(b)),
    routeErrors,
    totalViolationRules,
    totalViolationNodes,
    routes: routeResults,
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.writeFile(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8')
  await fs.writeFile(REPORT_MD, markdownReport(report), 'utf8')

  console.log(`Contrast audit complete. JSON report: ${REPORT_JSON}`)
  console.log(`Contrast audit complete. Markdown report: ${REPORT_MD}`)
  console.log(`Audited routes: ${report.auditedRouteCount}`)
  console.log(`Skipped dynamic routes: ${report.skippedDynamicRoutes.length}`)
  console.log(`Route errors: ${report.routeErrors.length}`)
  console.log(`Total violation rules: ${report.totalViolationRules}`)
  console.log(`Total violation nodes: ${report.totalViolationNodes}`)

  if (report.totalViolationRules > 0 || report.routeErrors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
