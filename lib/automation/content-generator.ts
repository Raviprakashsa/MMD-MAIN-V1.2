import { nanoid } from 'nanoid'
import ApplicationForm from '@/lib/db/models/ApplicationForm'
import Requirement from '@/lib/db/models/Requirement'
import { templates, TemplateType } from '@/lib/templates/hiring-messages'
import type { IRequirement } from '@/lib/db/models/Requirement'
import AuditLog from '@/lib/db/models/AuditLog'
import Company from '@/lib/db/models/Company'
import User from '@/lib/db/models/User'

interface GeneratedContent {
  whatsapp: string
  email: string
  linkedIn: string
}

export async function generateApplicationForm(requirement: IRequirement & { _id: any }) {
  const existing = await ApplicationForm.findOne({ requirementId: requirement._id })
  if (existing) {
    return { appForm: existing, shareableUrl: existing.shareableUrl }
  }

  const shareId = nanoid(10)
  const shareableUrl = `/apply/${shareId}`

  const formFields = [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, pattern: String.raw`^\+?[0-9]{10,15}$` },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'resume', label: 'Resume', type: 'file', required: true, maxSizeMB: 5, accept: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    {
      name: 'skills',
      label: 'Skills',
      type: 'text',
      placeholder: `Enter skills mentioned in JD: ${(requirement.skills || []).join(', ')}`,
      required: true,
    },
    {
      name: 'organization',
      label: 'College/Company',
      type: 'text',
      required: false,
    },
    {
      name: 'experience',
      label: 'Experience (years)',
      type: 'number',
      min: requirement.experienceMin,
      max: requirement.experienceMax,
      required: true,
    },
  ]

  const appForm = await ApplicationForm.create({
    requirementId: requirement._id,
    formFields,
    shareableUrl,
  })

  await Requirement.findByIdAndUpdate(requirement._id, {
    applicationFormId: appForm._id?.toString(),
  })

  await AuditLog.create({
    userId: requirement.accountOwnerId,
    action: 'APPLICATION_FORM_GENERATED',
    entity: 'Requirement',
    entityId: requirement._id.toString(),
    newValue: { shareableUrl },
  })

  return { appForm, shareableUrl }
}

function renderTemplate(tpl: string, data: Record<string, string>) {
  let out = tpl
  for (const [key, value] of Object.entries(data)) {
    out = out.replaceAll(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return out
}

export async function generateHiringContent(requirement: IRequirement & { _id: any }, formUrl: string): Promise<GeneratedContent> {
  const skillList = (requirement.skills || []).map((s) => `• ${s}`).join('\n')
  const salaryRange = requirement.salaryMin && requirement.salaryMax
    ? `${requirement.salaryMin}-${requirement.salaryMax}`
    : 'Not specified'

  const primarySkill = requirement.skills?.[0] || 'Skills'

  const [company, owner] = await Promise.all([
    Company.findById(requirement.companyId),
    User.findById(requirement.accountOwnerId),
  ])

  const data = {
    jobTitle: requirement.jobTitle,
    location: requirement.location,
    workMode: requirement.workMode,
    experienceMin: String(requirement.experienceMin),
    experienceMax: String(requirement.experienceMax),
    salaryRange,
    skills: skillList,
    formUrl,
    mmdId: requirement.mmdId,
    companyName: company?.name ?? 'Company',
    accountOwnerName: owner?.name ?? 'Hiring Team',
    companyCategory: company?.category ?? 'Hiring',
    primarySkill,
  }

  return {
    whatsapp: renderTemplate(templates.whatsapp, data),
    email: renderTemplate(templates.email, data),
    linkedIn: renderTemplate(templates.linkedIn, data),
  }
}

export async function applyGeneratedContent(requirementId: string, content: GeneratedContent) {
  await Requirement.findByIdAndUpdate(requirementId, {
    whatsAppMessage: content.whatsapp,
    emailMessage: content.email,
    linkedInPost: content.linkedIn,
  })
}

export async function regenerateSingleContent(
  requirementId: string,
  type: TemplateType,
  formUrl: string
) {
  const requirement = await Requirement.findById(requirementId)
  if (!requirement) throw new Error('Requirement not found')
  const generated = await generateHiringContent(requirement as any, formUrl)
  const update: any = {}
  if (type === 'whatsapp') {
    update.whatsAppMessage = generated[type]
  } else if (type === 'email') {
    update.emailMessage = generated[type]
  } else {
    update.linkedInPost = generated[type]
  }
  await Requirement.findByIdAndUpdate(requirementId, update)
  return generated[type]
}
