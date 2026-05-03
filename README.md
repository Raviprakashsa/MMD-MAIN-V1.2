# Magnus Copo Staffing Operations System

Enterprise staffing operations platform built as a modular monolith with Next.js App Router, TypeScript, MongoDB (Mongoose), role-aware workflows, automation pipelines, and operational reporting.

This README is an implementation-first project map describing what is already in the codebase today.

## 1) Product Overview

The platform handles end-to-end staffing operations in one system:

- user authentication and role-based authorization
- company and requirement lifecycle management
- candidate, placement, invoice, and timesheet workflows
- lead intake, pipeline movement, and conversion paths
- document upload/download with signed access
- notification, communication, and template features
- API key management and webhook delivery/inbound processing
- export jobs, report scheduling, automation pipelines, and cron runners

The codebase is beyond prototype stage and includes both business-facing dashboards and backend operational tooling.

## 2) Current Stack (Implemented)

- Framework: Next.js 16 App Router
- Language: TypeScript (strict)
- Runtime/UI: React 18
- Auth: NextAuth v5 credentials flow + JWT session callbacks
- Database: MongoDB + Mongoose models
- Validation: Zod
- Server entry patterns: Next Route Handlers + Server Actions (next-safe-action)
- State/query: TanStack Query
- Styling: Tailwind + Sass token/component layers + custom UI primitives
- Data viz: Recharts
- Motion/UI effects: Framer Motion, dnd-kit, Three.js/react-three stack
- QA tooling: ESLint, Playwright, BackstopJS, Galen layout checks

## 3) Architecture In Practice

The repository is organized as a layered modular monolith:

- Delivery layer:
  - App Router pages in app/*
  - Route handlers in app/api/*
  - Server Actions in lib/actions/*
- Domain layer:
  - Business services in lib/services/*
  - Workflow and governance helpers in lib/workflow/*
- Persistence layer:
  - Mongoose connection in lib/db/mongodb.ts
  - Domain models in lib/db/models/*
- Cross-cutting layer:
  - RBAC helpers in lib/auth/rbac.ts
  - API key auth in lib/auth/api-key.ts
  - request throttling and webhook signature middleware
  - audit/access logging services

Approximate implemented breadth (from repository inventory):

- services: 23
- database models: 30
- server action modules: 25
- route handlers: 20+

## 4) Implemented Functional Areas

### 4.1 Authentication and Access Control

- login UI and auth route integration
- credentials-based sign in with role/session propagation
- route-level protection and forbidden page handling
- role-aware permissions used in services and dashboards
- API key issuance, introspection, rotation, and revocation endpoints

### 4.2 Core Staffing Domains

- companies
- requirements
- candidates and candidate details
- placements (create/view/edit)
- invoices
- timesheets
- leads (kanban + table + analytics + conversion dialogs)

These are implemented across coordinated page, action, service, and model layers.

### 4.3 Communication, Notifications, and Templates

- communication pages and service layer
- notification center APIs and UI bell integration
- template management and editor/selector components
- hiring message template helpers in lib/templates/*

### 4.4 Documents and Public Intake

- secure document upload/download APIs
- candidate resume handling endpoint
- public application flow at apply/[slug]
- resume upload endpoint for external application intake

### 4.5 Reporting, Exports, and Analytics

- dashboard KPI/reporting components
- reporting services and generators
- export job orchestration + downloadable artifacts
- report scheduling cron path and service hooks

### 4.6 Automation and Integrations

- automation command center and queue heatmap pages
- automation pipeline service and realtime API path
- inbound webhook handler family
- webhook delivery queue/process/retry APIs
- integration config and integration service layer

## 5) Route and API Surface (High-Level)

### 5.1 Main App Routes

- /(auth)/login
- /(dashboard)/dashboard
- /(dashboard)/dashboard/activities
- /(dashboard)/dashboard/admin (+ archive)
- /(dashboard)/dashboard/automation/*
- /(dashboard)/dashboard/candidates (+ [id])
- /(dashboard)/dashboard/companies (+ [id])
- /(dashboard)/dashboard/requirements (+ [id])
- /(dashboard)/dashboard/placements (+ new, [id], [id]/edit)
- /(dashboard)/dashboard/invoices (+ new)
- /(dashboard)/dashboard/communications
- /(dashboard)/dashboard/notifications
- /(dashboard)/dashboard/reports
- /(dashboard)/dashboard/insights (+ reports)
- /(dashboard)/dashboard/templates
- /(dashboard)/dashboard/timesheet
- /(dashboard)/dashboard/users
- /(dashboard)/dashboard/leads
- /apply/[slug]
- /forbidden

### 5.2 API Families

- /api/auth/[...nextauth]
- /api/search
- /api/notifications
- /api/documents/*
- /api/candidates/[id]/resume
- /api/public/applications/upload-resume
- /api/exports/jobs/[id]/download
- /api/automation/realtime
- /api/cron/*
- /api/v1/health
- /api/v1/api-keys/*
- /api/v1/webhooks/*
- /api/v1/requirements/[id]/matches

## 6) Data Model Coverage

The Mongo model layer already includes core operational entities, including:

- identity/auth: User, Account, Session
- staffing domains: Company, Requirement, Candidate, Placement, Invoice, Timesheet, Lead, HRContact
- communication/collaboration: Message, CommunicationThread, CommunicationMessage, Notification, Template
- governance/operations: AuditLog, DataAccessLog, Activity, CandidateActivity, Counter
- integration/automation: ApiKey, IntegrationConfig, Webhook, WebhookDelivery, AutomationPipelineRun
- reporting/export/application intake: ReportSchedule, ExportJob, ApplicationForm, AnalyticsEvent, Document

Data governance patterns in active use:

- soft-delete behavior on key entities
- audit and access log generation for critical flows
- sequencing helpers for business identifiers

## 7) Background Work, Cron, and Reliability Utilities

Scheduled/operational processes are implemented with route-triggered handlers and scripts:

- cron endpoints:
  - automation-pipeline
  - daily-alerts
  - export-jobs
  - report-schedules
  - webhook-deliveries
- script utilities:
  - DB connectivity and diagnostics
  - phase 6 backfill and verification
  - embeddings backfill
  - synthetic seed data cleanup (dry-run + apply)
  - rollout and policy verification helpers

## 8) Local Setup From Scratch

### 8.1 Prerequisites

- Node.js 18+
- npm
- MongoDB local service or MongoDB Atlas connection

### 8.2 Install and Configure

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env
```

3. Set required values in .env:

- DATABASE_URL (Mongo connection string)
- NEXTAUTH_SECRET (strong random value)
- NEXTAUTH_URL (for local: http://localhost:3000)

Example secret generation:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

4. Seed baseline data/users:

```bash
npm run db:seed
```

5. Start development server:

```bash
npm run dev
```

Run the command from the repository root, the folder that contains `package.json`.

6. Open:

- http://localhost:3000

## 9) Operational Commands

### 9.1 Core Runtime

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run lint:fix
```

### 9.2 Database and Data Hygiene

```bash
npm run db:seed
npm run db:check
npm run db:cleanup:synthetic
npm run db:cleanup:synthetic:apply
```

### 9.3 Backfill and Verification

```bash
npm run db:backfill:phase6
npm run db:backfill:phase6:apply
npm run db:backfill:embeddings
npm run db:backfill:embeddings:apply
npm run verify:phase6
npm run verify:rollout
```

### 9.4 UI and Regression Audits

```bash
npm run audit:contrast
npm run test:visual
npm run test:visual:approve
npm run test:layout
```

## 10) Key Repository Directories

```text
app/                 App Router pages, layouts, and route handlers
components/          UI components and domain view components
lib/actions/         Server Actions grouped by module
lib/services/        Business services and orchestration
lib/db/models/       Mongoose schemas/models
lib/auth/            RBAC and API key helpers
lib/automation/      Matching, embeddings, and cron handlers
lib/workflow/        State machine and governance helpers
scripts/             Operational scripts and verification tools
tests/               Integration and layout checks
styles/              Design tokens, components, and utilities
```

## 11) Notes On Legacy/Drifted Files

Some historical references in the repository still mention Prisma or earlier setup language. Runtime data access in the active implementation is MongoDB + Mongoose.

When in doubt, trust:

- lib/db/mongodb.ts for connection behavior
- lib/db/models/* for schema reality
- package.json scripts for current operations

## 12) Production Readiness Considerations

Implemented strengths:

- broad domain and route coverage
- meaningful service-layer centralization
- audit/access tracking patterns
- retry/dead-letter behavior in automation/export/webhook paths

Areas to harden further as scale grows:

- centralized RBAC policy constants across all modules
- deeper readiness health checks (dependency-aware)
- distributed throttling for multi-instance deployments
- immutable export snapshots for strict reproducibility
- stricter secret separation for document signing vs auth

## 13) License

Proprietary - Magnus Copo Staffing Operations
