# Magnus Copo Platform SOP

Version: 1.0  
Last Updated: 2026-04-26  
Owner: Operations and Product Admin Team

## 1. Purpose

This SOP explains how to use the Magnus Copo Staffing Operations Platform in day-to-day operations.

It covers:
- what each feature is used for
- who should use it
- step-by-step workflows
- operational checks and governance routines

This SOP is based on currently implemented modules in the product.

## 2. Scope

This SOP applies to:
- SUPER_ADMIN
- ADMIN
- COORDINATOR
- RECRUITER
- SCRAPER

Main workspace routes covered:
- /dashboard
- /dashboard/companies
- /dashboard/requirements
- /dashboard/candidates
- /dashboard/placements
- /dashboard/invoices
- /dashboard/leads
- /dashboard/activities
- /dashboard/timesheet
- /dashboard/templates
- /dashboard/communications
- /dashboard/notifications
- /dashboard/reports
- /dashboard/automation/command-center
- /dashboard/automation/queue-heatmap
- /dashboard/integrations
- /dashboard/mail
- /dashboard/admin
- /dashboard/settings
- /apply/[slug] (public candidate form)

## 3. Platform At A Glance

The platform supports the full staffing lifecycle:
1. Source and qualify leads.
2. Convert qualified leads into companies.
3. Onboard company details and MOU state.
4. Create and manage requirements.
5. Generate automation assets (public apply links, messages, outreach drafts).
6. Receive and manage candidate applications.
7. Progress candidate pipeline.
8. Record placements.
9. Raise and track invoices.
10. Track activities, follow-ups, and timesheets.
11. Generate reports, schedules, and exports.
12. Operate integrations, notifications, and admin governance.

## 4. Role And Access Guide

## 4.1 SUPER_ADMIN
- Full platform access.
- User lifecycle control (create users, role changes, password reset, activate/deactivate).
- Access to settings, admin audit functions, and sensitive operations.

## 4.2 ADMIN
- Broad operational control across companies, requirements, reports, and governance dashboards.
- Can typically manage strategic workflow controls.

## 4.3 COORDINATOR
- Day-to-day orchestration across companies, requirements, candidates, reports, and timesheet approvals.

## 4.4 RECRUITER
- Candidate execution role: requirements follow-through, candidates, activities, placements, timesheet logging.

## 4.5 SCRAPER
- Lead sourcing and intake-heavy role.
- Restricted access in selected modules (for example some communication and activity contexts).

Note: Final permissions are enforced in both route protection and server-side action logic.

## 5. Startup SOP (Daily Login)

1. Open login page.
2. Sign in with assigned credentials.
3. Confirm role-specific dashboard loads.
4. Check notification count and pending work indicators.
5. Review automation alerts and overdue follow-ups before starting task execution.

## 6. End-To-End Operational Workflow (Recommended Sequence)

1. Leads team captures opportunities in Leads.
2. Qualified leads are converted to Companies.
3. Company MOU and contacts are completed in Companies.
4. Requirement owner creates Requirement linked to eligible company.
5. Automation panel generates apply form and outreach assets.
6. Candidates are sourced and/or collected from public apply form.
7. Candidate statuses move through pipeline to offer/joining.
8. Placement is created for successful joining.
9. Invoice is raised and tracked to payment.
10. Activities and timesheets are logged continuously.
11. Reports and exports are generated for operations review.

## 7. Detailed Module SOPs

## 7.1 Dashboard

Purpose:
- Role-based operational cockpit.

How to use:
1. Open /dashboard.
2. Use dashboard filters (date range, status scope, team scope where available).
3. Review KPIs and alerts.
4. Click module shortcuts to move to operational screens.

Output:
- Daily execution priorities and role-specific action list.

## 7.2 Companies

Purpose:
- Manage client organizations, HR contacts, and MOU readiness.

Key features:
- Create company
- Edit company
- Delete company (restricted)
- View company details popup
- Search, filter, sort
- MOU details and document reference
- Export jobs list and CSV export trigger

Step-by-step:
1. Open /dashboard/companies.
2. Use search and filters (status, sector, sort).
3. Click Add Company.
4. Fill required fields: name, category, location, coordinator.
5. Add HR contacts and mark one primary contact.
6. If MOU is signed, enter start date, end date, and commercial percentage.
7. Save.
8. Open View Details to validate full company profile.
9. Use Export CSV when needed for operational sharing.

Operational note:
- Company record quality directly affects requirement creation quality and compliance.

## 7.3 Requirements

Purpose:
- Manage open roles and hiring execution plans.

Key features:
- Create, edit, delete requirement
- Status updates and ownership handling
- Freeze/hold actions
- Reassign actions
- Requirement filtering and search
- Automation panel integration
- Export job trigger

Step-by-step:
1. Open /dashboard/requirements.
2. Click Add Requirement.
3. Select company (prefer active signed MOU companies where policy applies).
4. Enter role title, openings, location, budget, experience range, skills, and description.
5. Save requirement.
6. Use row actions to edit, freeze, reassign, or delete based on role permissions.
7. Open requirement details and launch automation from Automation panel.

Quality control:
- Ensure title, skills, openings, and owner assignment are accurate before sourcing starts.

## 7.4 Automation For Requirements

Purpose:
- Speed up requirement execution and candidate intake.

Key features:
- Generate automation assets
- Regenerate content by channel type
- Public application form retrieval by slug
- Public application submission action

Step-by-step:
1. Open a requirement card/detail.
2. Run automation generation.
3. Confirm generated artifacts:
   - shareable apply link
   - WhatsApp draft
   - email draft
   - LinkedIn draft
4. Use regenerate action for weak channel content.
5. Share the apply link in approved channels.

Monitoring:
- Track automation status, attempts, and last errors where displayed.

## 7.5 Public Application Flow

Purpose:
- External candidate intake via public form.

Steps:
1. Candidate opens /apply/[slug].
2. Candidate fills form fields.
3. Candidate uploads resume file (if required by form).
4. System validates file and requirement acceptance rules.
5. Candidate submits application.
6. Application enters internal candidate pipeline for processing.

Operational controls:
- Upload endpoint is throttled and validates mime type/extension.
- Closed or on-hold requirement statuses block intake.

## 7.6 Candidates

Purpose:
- Manage candidate pipeline from application to final decision.

Key features:
- Add candidate
- Edit candidate
- Delete candidate
- Status transitions
- Search and filter
- Requirement linking
- Resume reference

Step-by-step:
1. Open /dashboard/candidates.
2. Use search/filter to locate candidate or segment pipeline.
3. Click Add Candidate and complete profile.
4. Link to requirement where applicable.
5. Update candidate status as process advances.
6. Add notes and maintain clean communication history.
7. Move successful profiles to placement workflow.

Status hygiene:
- Keep status transitions timely to preserve report accuracy.

## 7.7 Placements

Purpose:
- Track successful hiring outcomes and commercial milestones.

Key features:
- Placement list
- Create placement
- Edit placement details
- Delete placement (role-based)
- Status tracking

Step-by-step:
1. Open /dashboard/placements.
2. Click New Placement.
3. Select candidate and requirement.
4. Verify linked company.
5. Enter joining date, status, and fee details.
6. Save placement.
7. Update placement status as onboarding and payment events occur.

Output:
- Placement records power invoice and performance reporting.

## 7.8 Invoices

Purpose:
- Manage billing lifecycle for placements.

Key features:
- List and metrics view
- Create invoice
- Update invoice status
- Delete invoice (restricted)
- CSV export

Step-by-step:
1. Open /dashboard/invoices.
2. Click Create Invoice.
3. Map invoice to placement/company.
4. Enter amount, currency, issue date, due date.
5. Save.
6. Use status update actions to reflect payment lifecycle.
7. Export list as CSV when needed.

Control points:
- Keep invoice status current for finance reporting and aging analysis.

## 7.9 Leads

Purpose:
- Intake and qualify potential client opportunities.

Key features:
- Create lead
- Edit lead
- Delete lead (role-based)
- Convert lead to company
- Add lead activity
- Lead analytics and pipeline views
- CSV export for selected/all leads

Step-by-step:
1. Open /dashboard/leads.
2. Add new lead with source, company/contact details, confidence, status, follow-up.
3. Track lead movement through pipeline statuses.
4. Log follow-up activities for accountability.
5. Convert qualified lead into company when ready.
6. Export lead list for external review.

Control points:
- Maintain confidence scores and follow-up dates for prioritization.

## 7.10 Activities

Purpose:
- Log operational actions and follow-up commitments against requirements.

Key features:
- Add activity with type and outcome
- Set next follow-up date
- View upcoming follow-ups
- View stalled requirements

Step-by-step:
1. Open /dashboard/activities.
2. Select requirement.
3. Choose activity type and outcome.
4. Enter summary.
5. Add next follow-up date if needed.
6. Save.
7. Review overdue follow-ups and stalled requirements daily.

Operational value:
- This is the source for follow-up discipline and activity-based governance.

## 7.11 Timesheet

Purpose:
- Capture recruiter and team effort data for productivity and approval workflows.

Key features:
- Log work entries
- Weekly and monthly views
- Edit/delete entries
- Pending approval list
- Approve timesheets (authorized roles)

Step-by-step:
1. Open /dashboard/timesheet.
2. Choose date from week/month calendar.
3. Click Add/Log Work.
4. Enter hours, work type, description, optional requirement link.
5. Save.
6. For managers/admins, open pending approvals and approve valid entries.

Good practice:
- Log work daily to avoid backdated cleanup and approval delays.

## 7.12 Templates

Purpose:
- Reuse standardized communication content.

Key features:
- Create template
- Edit template
- Duplicate template
- Render/preview template with variables
- Search and category filtering

Step-by-step:
1. Open /dashboard/templates.
2. Click New Template.
3. Enter name, category, subject, body, and public/private preference.
4. Insert variable placeholders in body text.
5. Save template.
6. Use preview/render to validate output.
7. Duplicate high-performing templates for variant experiments.

Note:
- Backend supports delete action; current UI emphasizes create, edit, duplicate, and preview workflows.

## 7.13 Communications

Purpose:
- Structured conversation threads tied to core entities.

Key features:
- Create communication thread
- List/filter threads by entity context
- Post messages into thread
- Close thread
- Paginated thread and message loading

Step-by-step:
1. Open /dashboard/communications.
2. Create thread with entity type and entity id.
3. Add participants and subject.
4. Post channel messages (email/whatsapp/call/note as configured).
5. Close thread when context is resolved.

## 7.14 Notifications

Purpose:
- Alert center for follow-ups and workflow signals.

Key features:
- List notifications
- Search notifications
- Unread-only filter
- Mark single read
- Mark all read
- Auto-refresh

Step-by-step:
1. Open /dashboard/notifications.
2. Review unread alerts first.
3. Click into linked entity when available.
4. Mark addressed items as read.
5. Use mark all read only after backlog is actually cleared.

## 7.15 Reports

Purpose:
- Generate operational intelligence and shareable outputs.

Key features:
- Report generation by type
- Date and attribute filters
- View and CSV output
- Analytics metric recording
- Schedule creation and activation toggles

Supported report types:
- Daily Activity
- Requirement Status
- Candidate Pipeline
- Timesheet
- Source Conversion

Step-by-step:
1. Open /dashboard/reports.
2. Select report type.
3. Set date range and filters.
4. Click Run for preview or CSV.
5. Configure schedule name, frequency, recipients.
6. Create schedule and enable/disable as needed.

## 7.16 Automation Command Center

Purpose:
- Live monitoring and control of automation pipeline state.

Routes:
- /dashboard/automation/command-center
- /dashboard/automation/queue-heatmap

Features:
- Live telemetry refresh
- Throughput and stage health views
- Queue pressure heat grid
- Manual run trigger
- External source and run status snapshots

Step-by-step:
1. Open command center.
2. Confirm live mode is active.
3. Check stage health and alerts.
4. Trigger manual run when operationally justified.
5. Open queue heatmap for pressure hotspots.
6. Escalate sustained critical stages to engineering support.

## 7.17 Integrations

Purpose:
- Manage external provider configurations.

Features:
- Create integration config
- Edit integration config
- Enable/disable toggle
- Test connection
- Delete config

Step-by-step:
1. Open /dashboard/integrations.
2. Click Add Integration.
3. Set name, provider type, active state.
4. Enter JSON configuration.
5. Save.
6. Run connection test.
7. Monitor health badge and message.

## 7.18 Mail

Purpose:
- Internal request/inbox workflow between team and admin roles.

Features:
- User request creation
- Admin inbox listing
- Mark read
- Delete message (restricted)
- Search and detail view

Step-by-step:
1. Open /dashboard/mail.
2. Non-admin users: create new request with subject/body/type.
3. Admin users: review inbox and open details.
4. Mark read after action.
5. Super admin can delete obsolete messages if policy allows.

## 7.19 Admin

Purpose:
- Governance view with high-level audit and system metrics.

Features:
- User/company/system cards
- Audit feed filters
- CSV export of visible audit rows

Step-by-step:
1. Open /dashboard/admin.
2. Review key health cards.
3. Filter audit actions and entities.
4. Export logs for compliance review as needed.

## 7.20 Settings (Super Admin Console)

Purpose:
- Identity and access management.

Features:
- Create users
- Update role and active state
- Reset passwords
- User search/filtering
- Role capability reference panel

Step-by-step:
1. Open /dashboard/settings.
2. Use Add User for new account provisioning.
3. Use Access modal to change role or activate/deactivate account.
4. Use Password modal for secure reset.
5. Confirm user can sign in after changes.

Security rules:
- Enforce strong passwords.
- Apply least privilege role assignment.
- Track all critical access changes.

## 8. API And Integration Operations

## 8.1 API Keys

Purpose:
- Secure machine-to-machine access.

Available server actions include:
- create key
- list keys
- rotate key
- revoke key

Suggested SOP:
1. Create key only for approved integration use case.
2. Assign minimum required scopes.
3. Store secret in approved secret manager.
4. Rotate on schedule and after suspected exposure.
5. Revoke immediately when integration is retired.

## 8.2 Webhooks And Delivery

Purpose:
- Event delivery and inbound integration patterns.

Operational practice:
1. Configure webhook targets in integrations.
2. Monitor delivery outcomes.
3. Reprocess failed deliveries where appropriate.
4. Verify dead-letter events are investigated and closed.

## 9. Daily, Weekly, Monthly Operating Routines

## 9.1 Daily Checklist

1. Check dashboard KPIs and alerts.
2. Clear overdue follow-ups in Activities and Leads.
3. Update candidate and requirement statuses.
4. Log timesheet entries before end of day.
5. Review unread notifications.

## 9.2 Weekly Checklist

1. Review stalled requirements.
2. Review lead conversion ratio.
3. Validate placement and invoice aging.
4. Run core reports and share with leadership.
5. Verify automation pipeline health trends.

## 9.3 Monthly Checklist

1. Access review: inactive users, role drift, password resets.
2. Integration review: stale configs, failed tests, decommissioned endpoints.
3. Data quality review across companies, requirements, candidates.
4. Export governance pack for audit and finance stakeholders.

## 10. Data Quality Standards

1. Every requirement must have clear title, skills, openings, and owner.
2. Every company must have at least one usable contact.
3. Candidate status must be updated at each pipeline transition.
4. Placement and invoice statuses must reflect real-world state.
5. Follow-up dates must be maintained for actionable records.
6. Timesheet entries should be same-day whenever possible.

## 11. Incident And Escalation SOP

## 11.1 When To Escalate Immediately
- Automation pipeline shows repeated critical failures.
- Public application form submissions fail repeatedly.
- Invoice or placement data inconsistency affects client billing.
- Authentication or access control anomalies.

## 11.2 Escalation Steps
1. Capture route, user role, timestamp, and error text.
2. Capture reproducible steps.
3. Notify platform admin and engineering owner.
4. Apply workaround if approved.
5. Track resolution and validate end-to-end flow after fix.

## 12. Pre-Release Operational SOP

Before customer-facing release:
1. Run typecheck and lint.
2. Run production build.
3. Run release verification scripts.
4. Validate environment secrets.
5. Confirm background job and cron readiness.
6. Validate critical flows:
   - login
   - requirement creation
   - candidate status update
   - placement and invoice update
   - report generation and export

## 13. Troubleshooting Quick Guide

Issue: Cannot create requirement for company  
Action: Verify company MOU state and required fields.

Issue: Candidate submission failing from public link  
Action: Validate slug, requirement status, and resume file constraints.

Issue: Report schedule not running  
Action: Check schedule active state, recipients, and cron configuration.

Issue: Timesheet approval list empty unexpectedly  
Action: Verify role permissions and pending entry criteria.

Issue: Integration test failing  
Action: Revalidate JSON config, endpoint URL, auth token, and network access.

## 14. Operational Ownership Matrix

- Super Admin: security, access, platform governance
- Admin: business controls, audit, delivery governance
- Coordinator: execution orchestration and quality checks
- Recruiter: candidate lifecycle and delivery throughput
- Scraper: lead intake and sourcing pipeline health

## 15. Revision Policy

Update this SOP when any of the following changes:
- role permissions
- module workflow changes
- new automation/reporting capabilities
- compliance or audit requirements
- integration contract changes

End of document.
