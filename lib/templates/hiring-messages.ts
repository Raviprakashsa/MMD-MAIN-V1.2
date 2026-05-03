export const templates = {
  whatsapp: `🎯 *New Opportunity: {{jobTitle}}*

📍 Location: {{location}}
💼 Type: {{workMode}} | {{experienceMin}}-{{experienceMax}} yrs
💰 CTC: {{salaryRange}}

*Skills Required:*
{{skills}}

Apply here: {{formUrl}}

Ref ID: {{mmdId}}`,
  email: `Subject: Job Opening: {{jobTitle}} at {{companyName}}

Dear Candidate,

We are hiring for {{jobTitle}} ({{experienceMin}}-{{experienceMax}} years).

Key Skills: {{skills}}
Location: {{location}}
Work Mode: {{workMode}}

Submit your application: {{formUrl}}

Requirement ID: {{mmdId}}

Best regards,
{{accountOwnerName}}`,
  linkedIn: `🚀 Hiring Alert: {{jobTitle}}

We're looking for talented professionals with {{experienceMin}}+ years in {{primarySkill}}.

📍 {{location}} | {{workMode}}
🏢 {{companyName}}

Apply: {{formUrl}}

#Hiring #{{companyCategory}} #{{primarySkill}} #Jobs`
}

export type TemplateType = keyof typeof templates
