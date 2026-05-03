import connectDB from './mongodb'
import User, { type UserRole } from './models/User'
import Company, {
  type HiringType,
  type LeadSource,
  type MouStatus,
  type Sector,
} from './models/Company'
import Requirement, {
  type Group,
  type RequirementPriority,
  type RequirementStatus,
  type WorkMode,
} from './models/Requirement'
import Candidate, { type CandidateStatus } from './models/Candidate'
import Activity, { type ActivityType, type OutcomeType } from './models/Activity'
import Lead, { type LeadStatus } from './models/Lead'
import Template from './models/Template'
import { hash } from 'bcryptjs'
import { addDays, addHours, subDays, subHours } from 'date-fns'
import { formatMmdId, getRequirementIdPrefix } from '../utils'

interface UserSeedData {
  email: string
  password: string
  name: string
  role: UserRole
}

interface CompanySeedData {
  name: string
  category: string
  sector: Sector
  location: string
  website: string
  hiringType: HiringType
  source: LeadSource
  mouStatus: MouStatus
  mouStartDate: Date | null
  mouEndDate: Date | null
  commercialPercent: number | null
  assignedCoordinatorEmail: string
}

interface RequirementSeedData {
  companyName: string
  ownerEmail: string
  group: Group
  jobTitle: string
  status: RequirementStatus
  openings: number
  skills: string[]
  fullDescription: string
  workMode: WorkMode
  experienceMin: number
  experienceMax: number
  location: string
  salaryMin: number
  salaryMax: number
  priority: RequirementPriority
  createdDaysAgo: number
}

interface CandidateSeedData {
  requirementTitle: string
  name: string
  email: string
  phone: string
  status: CandidateStatus
  yearsExperience: number
  skills: string[]
  daysAgoApplied: number
}

interface ActivitySeedData {
  requirementTitle: string
  ownerEmail: string
  type: ActivityType
  summary: string
  outcome: OutcomeType
  createdHoursAgo: number
  nextFollowUpOffsetHours?: number
  isCompleted?: boolean
}

interface LeadSeedData {
  sourcePlatform: string
  companyName: string
  sector: Sector
  confidenceScore: number
  status: LeadStatus
  contactName: string
  contactEmail: string
}

interface TemplateSeedData {
  name: string
  category: string
  subject: string
  body: string
}

interface SeedMutationStats {
  created: number
  updated: number
}

interface CleanupStats {
  requirementsRemoved: number
  activitiesRemoved: number
  candidatesRemoved: number
}

interface SeededCompanyRef {
  id: string
  sector: Sector
}

interface SeededRequirementRef {
  id: string
  mmdId: string
}

const SYNTHETIC_ROLE_TITLE_REGEX = /^synthetic role\s+\d+$/i
const SYNTHETIC_ACTIVITY_SUMMARY_REGEX = /^synthetic activity\s+\d+\s+for\s+/i
const LEGACY_FAKE_CANDIDATE_EMAIL_REGEX = /@email\.com$/i

const defaultUsers: UserSeedData[] = [
  {
    email: 'admin@magnuscopo.com',
    password: 'Admin123!',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  },
  {
    email: 'admin_limited@magnuscopo.com',
    password: 'Admin123!',
    name: 'Limited Administrator',
    role: 'ADMIN',
  },
  {
    email: 'rashmi@magnuscopo.com',
    password: 'Coordinator123!',
    name: 'Rashmi Sharma',
    role: 'COORDINATOR',
  },
  {
    email: 'manjunath@magnuscopo.com',
    password: 'Coordinator123!',
    name: 'Manjunath Kumar',
    role: 'COORDINATOR',
  },
  {
    email: 'priya@magnuscopo.com',
    password: 'Recruiter123!',
    name: 'Priya Patel',
    role: 'RECRUITER',
  },
  {
    email: 'rahul@magnuscopo.com',
    password: 'Recruiter123!',
    name: 'Rahul Singh',
    role: 'RECRUITER',
  },
  {
    email: 'scraper@magnuscopo.com',
    password: 'Scraper123!',
    name: 'Data Scraper',
    role: 'SCRAPER',
  },
]

const sampleCompanies: CompanySeedData[] = [
  {
    name: 'TechVision Solutions',
    category: 'Software Development',
    sector: 'IT',
    location: 'Bangalore, India',
    website: 'https://techvision.example',
    hiringType: 'PERMANENT',
    source: 'REFERRAL',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 120),
    mouEndDate: addDays(new Date(), 240),
    commercialPercent: 12,
    assignedCoordinatorEmail: 'rashmi@magnuscopo.com',
  },
  {
    name: 'FinanceFirst Corp',
    category: 'Banking and Finance',
    sector: 'NON_IT',
    location: 'Mumbai, India',
    website: 'https://financefirst.example',
    hiringType: 'PERMANENT',
    source: 'EVENT',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 90),
    mouEndDate: addDays(new Date(), 150),
    commercialPercent: 10,
    assignedCoordinatorEmail: 'rashmi@magnuscopo.com',
  },
  {
    name: 'HealthPlus Systems',
    category: 'Healthcare Technology',
    sector: 'IT',
    location: 'Hyderabad, India',
    website: 'https://healthplus.example',
    hiringType: 'CONTRACT',
    source: 'LEAD',
    mouStatus: 'IN_PROGRESS',
    mouStartDate: null,
    mouEndDate: null,
    commercialPercent: null,
    assignedCoordinatorEmail: 'manjunath@magnuscopo.com',
  },
  {
    name: 'GreenEnergy Dynamics',
    category: 'Renewable Energy',
    sector: 'CORE',
    location: 'Chennai, India',
    website: 'https://greenenergy.example',
    hiringType: 'PERMANENT',
    source: 'REFERRAL',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 200),
    mouEndDate: addDays(new Date(), 20),
    commercialPercent: 15,
    assignedCoordinatorEmail: 'manjunath@magnuscopo.com',
  },
  {
    name: 'StartupX Innovations',
    category: 'Product Development',
    sector: 'STARTUP',
    location: 'Pune, India',
    website: 'https://startupx.example',
    hiringType: 'INTERNSHIP',
    source: 'EVENT',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 30),
    mouEndDate: addDays(new Date(), 300),
    commercialPercent: 8,
    assignedCoordinatorEmail: 'rashmi@magnuscopo.com',
  },
  {
    name: 'LogiFlow Freight',
    category: 'Logistics',
    sector: 'CORE',
    location: 'Delhi, India',
    website: 'https://logiflow.example',
    hiringType: 'PERMANENT',
    source: 'REFERRAL',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 60),
    mouEndDate: addDays(new Date(), 210),
    commercialPercent: 14,
    assignedCoordinatorEmail: 'manjunath@magnuscopo.com',
  },
  {
    name: 'CyberGuard Security',
    category: 'Cybersecurity',
    sector: 'IT',
    location: 'Bangalore, India',
    website: 'https://cyberguard.example',
    hiringType: 'CONTRACT',
    source: 'REFERRAL',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 75),
    mouEndDate: addDays(new Date(), 175),
    commercialPercent: 18,
    assignedCoordinatorEmail: 'rashmi@magnuscopo.com',
  },
  {
    name: 'AgriNova Foods',
    category: 'AgriTech',
    sector: 'NON_IT',
    location: 'Indore, India',
    website: 'https://agrinova.example',
    hiringType: 'PERMANENT',
    source: 'LEAD',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 180),
    mouEndDate: addDays(new Date(), 60),
    commercialPercent: 9,
    assignedCoordinatorEmail: 'manjunath@magnuscopo.com',
  },
  {
    name: 'Quantum AI Labs',
    category: 'Deep Tech',
    sector: 'ENTERPRISE',
    location: 'Bangalore, India',
    website: 'https://quantumai.example',
    hiringType: 'PERMANENT',
    source: 'EVENT',
    mouStatus: 'SIGNED',
    mouStartDate: subDays(new Date(), 45),
    mouEndDate: addDays(new Date(), 365),
    commercialPercent: 20,
    assignedCoordinatorEmail: 'rashmi@magnuscopo.com',
  },
  {
    name: 'UrbanBuild Constructions',
    category: 'Construction',
    sector: 'CORE',
    location: 'Hyderabad, India',
    website: 'https://urbanbuild.example',
    hiringType: 'CONTRACT',
    source: 'REFERRAL',
    mouStatus: 'NOT_STARTED',
    mouStartDate: null,
    mouEndDate: null,
    commercialPercent: null,
    assignedCoordinatorEmail: 'manjunath@magnuscopo.com',
  },
]

const sampleRequirements: RequirementSeedData[] = [
  {
    companyName: 'TechVision Solutions',
    ownerEmail: 'priya@magnuscopo.com',
    group: 'RASHMI',
    jobTitle: 'Senior Full Stack Developer',
    status: 'ACTIVE',
    openings: 3,
    skills: ['React', 'Node.js', 'MongoDB'],
    fullDescription:
      'Lead delivery of customer-facing web products, mentor junior engineers, and own architecture reviews across React and Node.js services.',
    workMode: 'HYBRID',
    experienceMin: 5,
    experienceMax: 8,
    location: 'Bangalore, India',
    salaryMin: 2500000,
    salaryMax: 3500000,
    priority: 'High',
    createdDaysAgo: 24,
  },
  {
    companyName: 'TechVision Solutions',
    ownerEmail: 'rahul@magnuscopo.com',
    group: 'MANJUNATH',
    jobTitle: 'DevOps Engineer',
    status: 'SOURCING',
    openings: 2,
    skills: ['AWS', 'Kubernetes', 'Docker'],
    fullDescription:
      'Build and maintain secure CI and CD pipelines, improve cloud reliability, and optimize infra costs across multi-account AWS environments.',
    workMode: 'REMOTE',
    experienceMin: 4,
    experienceMax: 7,
    location: 'Pune, India',
    salaryMin: 1800000,
    salaryMax: 2800000,
    priority: 'Medium',
    createdDaysAgo: 20,
  },
  {
    companyName: 'CyberGuard Security',
    ownerEmail: 'priya@magnuscopo.com',
    group: 'RASHMI',
    jobTitle: 'Data Scientist',
    status: 'INTERVIEWING',
    openings: 1,
    skills: ['Python', 'Machine Learning', 'TensorFlow'],
    fullDescription:
      'Develop predictive models for cyber threat analytics and partner with engineering to operationalize model pipelines for production use.',
    workMode: 'ONSITE',
    experienceMin: 3,
    experienceMax: 6,
    location: 'Hyderabad, India',
    salaryMin: 2000000,
    salaryMax: 3000000,
    priority: 'High',
    createdDaysAgo: 16,
  },
  {
    companyName: 'FinanceFirst Corp',
    ownerEmail: 'rahul@magnuscopo.com',
    group: 'MANJUNATH',
    jobTitle: 'Product Manager',
    status: 'AWAITING_JD',
    openings: 1,
    skills: ['Agile', 'Scrum', 'Product Strategy'],
    fullDescription:
      'Drive product roadmap planning, prioritize backlog, and coordinate delivery with engineering and design teams for fintech products.',
    workMode: 'HYBRID',
    experienceMin: 6,
    experienceMax: 10,
    location: 'Mumbai, India',
    salaryMin: 3000000,
    salaryMax: 4500000,
    priority: 'Medium',
    createdDaysAgo: 12,
  },
  {
    companyName: 'StartupX Innovations',
    ownerEmail: 'priya@magnuscopo.com',
    group: 'RASHMI',
    jobTitle: 'UI/UX Designer',
    status: 'ACTIVE',
    openings: 2,
    skills: ['Figma', 'Adobe XD', 'User Research'],
    fullDescription:
      'Design and test intuitive user journeys, produce high-fidelity prototypes, and collaborate with product and frontend teams on rollout.',
    workMode: 'REMOTE',
    experienceMin: 2,
    experienceMax: 5,
    location: 'Bangalore, India',
    salaryMin: 1200000,
    salaryMax: 2000000,
    priority: 'Medium',
    createdDaysAgo: 10,
  },
  {
    companyName: 'Quantum AI Labs',
    ownerEmail: 'rahul@magnuscopo.com',
    group: 'MANJUNATH',
    jobTitle: 'Cloud Architect',
    status: 'OFFER',
    openings: 1,
    skills: ['Azure', 'AWS', 'GCP'],
    fullDescription:
      'Define cloud architecture standards, guide migration plans, and enforce security and governance controls across business units.',
    workMode: 'HYBRID',
    experienceMin: 10,
    experienceMax: 15,
    location: 'Chennai, India',
    salaryMin: 4000000,
    salaryMax: 6000000,
    priority: 'High',
    createdDaysAgo: 9,
  },
  {
    companyName: 'HealthPlus Systems',
    ownerEmail: 'priya@magnuscopo.com',
    group: 'RASHMI',
    jobTitle: 'Mobile Engineer',
    status: 'PENDING_INTAKE',
    openings: 2,
    skills: ['React Native', 'Flutter', 'iOS'],
    fullDescription:
      'Build and maintain mobile applications for clinical operations, improve app performance, and support secure release processes.',
    workMode: 'ONSITE',
    experienceMin: 3,
    experienceMax: 6,
    location: 'Gurgaon, India',
    salaryMin: 1500000,
    salaryMax: 2500000,
    priority: 'Medium',
    createdDaysAgo: 8,
  },
  {
    companyName: 'GreenEnergy Dynamics',
    ownerEmail: 'rahul@magnuscopo.com',
    group: 'MANJUNATH',
    jobTitle: 'QA Lead',
    status: 'ON_HOLD',
    openings: 1,
    skills: ['Selenium', 'Cypress', 'Test Automation'],
    fullDescription:
      'Lead quality strategy, automate regression suites, and define release quality gates for cross-functional delivery squads.',
    workMode: 'REMOTE',
    experienceMin: 7,
    experienceMax: 12,
    location: 'Noida, India',
    salaryMin: 2200000,
    salaryMax: 3200000,
    priority: 'Low',
    createdDaysAgo: 15,
  },
  {
    companyName: 'LogiFlow Freight',
    ownerEmail: 'priya@magnuscopo.com',
    group: 'RASHMI',
    jobTitle: 'Backend Engineer',
    status: 'CLOSED_HIRED',
    openings: 2,
    skills: ['Java', 'Spring Boot', 'Microservices'],
    fullDescription:
      'Develop backend services for shipment orchestration, optimize API latency, and support integrations with warehouse systems.',
    workMode: 'HYBRID',
    experienceMin: 4,
    experienceMax: 8,
    location: 'Bangalore, India',
    salaryMin: 2000000,
    salaryMax: 3000000,
    priority: 'High',
    createdDaysAgo: 28,
  },
  {
    companyName: 'FinanceFirst Corp',
    ownerEmail: 'rahul@magnuscopo.com',
    group: 'MANJUNATH',
    jobTitle: 'Finance Controller',
    status: 'CLOSED_NOT_HIRED',
    openings: 1,
    skills: ['FP&A', 'Controllership', 'IFRS'],
    fullDescription:
      'Own controllership operations, lead audits, and strengthen compliance and financial reporting standards for enterprise growth.',
    workMode: 'HYBRID',
    experienceMin: 8,
    experienceMax: 12,
    location: 'Mumbai, India',
    salaryMin: 2800000,
    salaryMax: 3600000,
    priority: 'Medium',
    createdDaysAgo: 35,
  },
  {
    companyName: 'AgriNova Foods',
    ownerEmail: 'priya@magnuscopo.com',
    group: 'RASHMI',
    jobTitle: 'Business Analyst',
    status: 'ACTIVE',
    openings: 2,
    skills: ['SQL', 'JIRA', 'User Stories'],
    fullDescription:
      'Gather requirements from business stakeholders, refine user stories, and support sprint planning for process automation projects.',
    workMode: 'HYBRID',
    experienceMin: 3,
    experienceMax: 6,
    location: 'Pune, India',
    salaryMin: 1200000,
    salaryMax: 1800000,
    priority: 'Medium',
    createdDaysAgo: 6,
  },
]

const sampleCandidates: CandidateSeedData[] = [
  {
    requirementTitle: 'Senior Full Stack Developer',
    name: 'Arun Kumar',
    email: 'arun.kumar@demo.magnuscopo.com',
    phone: '+91 9876543210',
    status: 'SHORTLISTED',
    yearsExperience: 6,
    skills: ['React', 'Node.js', 'MongoDB'],
    daysAgoApplied: 18,
  },
  {
    requirementTitle: 'Senior Full Stack Developer',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@demo.magnuscopo.com',
    phone: '+91 9876543211',
    status: 'APPLIED',
    yearsExperience: 5,
    skills: ['TypeScript', 'Next.js', 'PostgreSQL'],
    daysAgoApplied: 7,
  },
  {
    requirementTitle: 'DevOps Engineer',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@demo.magnuscopo.com',
    phone: '+91 9876543212',
    status: 'INTERVIEWED',
    yearsExperience: 7,
    skills: ['AWS', 'Kubernetes', 'Terraform'],
    daysAgoApplied: 14,
  },
  {
    requirementTitle: 'Data Scientist',
    name: 'Priyanka Das',
    email: 'priyanka.das@demo.magnuscopo.com',
    phone: '+91 9876543213',
    status: 'OFFERED',
    yearsExperience: 4,
    skills: ['Python', 'TensorFlow', 'MLOps'],
    daysAgoApplied: 16,
  },
  {
    requirementTitle: 'Product Manager',
    name: 'Raj Patel',
    email: 'raj.patel@demo.magnuscopo.com',
    phone: '+91 9876543214',
    status: 'APPLIED',
    yearsExperience: 8,
    skills: ['Roadmapping', 'Stakeholder Mgmt', 'Analytics'],
    daysAgoApplied: 5,
  },
  {
    requirementTitle: 'UI/UX Designer',
    name: 'Ananya Gupta',
    email: 'ananya.gupta@demo.magnuscopo.com',
    phone: '+91 9876543215',
    status: 'SHORTLISTED',
    yearsExperience: 3,
    skills: ['Figma', 'Design Systems', 'Prototyping'],
    daysAgoApplied: 10,
  },
  {
    requirementTitle: 'Cloud Architect',
    name: 'Karthik Nair',
    email: 'karthik.nair@demo.magnuscopo.com',
    phone: '+91 9876543216',
    status: 'OFFERED',
    yearsExperience: 12,
    skills: ['Azure', 'Landing Zones', 'Security'],
    daysAgoApplied: 19,
  },
  {
    requirementTitle: 'Backend Engineer',
    name: 'Meera Shah',
    email: 'meera.shah@demo.magnuscopo.com',
    phone: '+91 9876543217',
    status: 'JOINED',
    yearsExperience: 5,
    skills: ['Java', 'Spring Boot', 'Kafka'],
    daysAgoApplied: 42,
  },
  {
    requirementTitle: 'Finance Controller',
    name: 'Sanjay Verma',
    email: 'sanjay.verma@demo.magnuscopo.com',
    phone: '+91 9876543218',
    status: 'REJECTED',
    yearsExperience: 10,
    skills: ['Controllership', 'IFRS', 'Audit'],
    daysAgoApplied: 25,
  },
  {
    requirementTitle: 'Business Analyst',
    name: 'Deepa Iyer',
    email: 'deepa.iyer@demo.magnuscopo.com',
    phone: '+91 9876543219',
    status: 'INTERVIEWED',
    yearsExperience: 4,
    skills: ['SQL', 'Process Mapping', 'JIRA'],
    daysAgoApplied: 12,
  },
  {
    requirementTitle: 'QA Lead',
    name: 'Amit Sharma',
    email: 'amit.sharma@demo.magnuscopo.com',
    phone: '+91 9876543220',
    status: 'SHORTLISTED',
    yearsExperience: 8,
    skills: ['Cypress', 'Playwright', 'Quality Strategy'],
    daysAgoApplied: 11,
  },
  {
    requirementTitle: 'Mobile Engineer',
    name: 'Lakshmi Menon',
    email: 'lakshmi.menon@demo.magnuscopo.com',
    phone: '+91 9876543221',
    status: 'APPLIED',
    yearsExperience: 4,
    skills: ['React Native', 'iOS', 'Android'],
    daysAgoApplied: 6,
  },
]

const sampleActivities: ActivitySeedData[] = [
  {
    requirementTitle: 'Senior Full Stack Developer',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'CALL',
    summary: 'Kickoff call completed with hiring manager and technical panel.',
    outcome: 'POSITIVE',
    createdHoursAgo: 96,
    isCompleted: true,
  },
  {
    requirementTitle: 'Senior Full Stack Developer',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'EMAIL',
    summary: 'Shared first shortlist of five full-stack profiles for review.',
    outcome: 'PENDING',
    createdHoursAgo: 48,
    nextFollowUpOffsetHours: -8,
  },
  {
    requirementTitle: 'DevOps Engineer',
    ownerEmail: 'rahul@magnuscopo.com',
    type: 'MEETING',
    summary: 'Calibration meeting held to finalize must-have DevOps capabilities.',
    outcome: 'POSITIVE',
    createdHoursAgo: 72,
    isCompleted: true,
  },
  {
    requirementTitle: 'DevOps Engineer',
    ownerEmail: 'rahul@magnuscopo.com',
    type: 'FOLLOW_UP',
    summary: 'Waiting for interview panel availability to start first round.',
    outcome: 'PENDING',
    createdHoursAgo: 18,
    nextFollowUpOffsetHours: 6,
  },
  {
    requirementTitle: 'Data Scientist',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'INTERVIEW',
    summary: 'First technical interview completed for top candidate.',
    outcome: 'POSITIVE',
    createdHoursAgo: 30,
    isCompleted: true,
  },
  {
    requirementTitle: 'Data Scientist',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'EMAIL',
    summary: 'Shared interview scorecard and requested panel feedback.',
    outcome: 'POSITIVE',
    createdHoursAgo: 20,
    isCompleted: true,
  },
  {
    requirementTitle: 'Product Manager',
    ownerEmail: 'rahul@magnuscopo.com',
    type: 'EMAIL',
    summary: 'Requested missing JD details for product roadmap ownership.',
    outcome: 'PENDING',
    createdHoursAgo: 22,
    nextFollowUpOffsetHours: -4,
  },
  {
    requirementTitle: 'UI/UX Designer',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'WHATSAPP',
    summary: 'Confirmed candidate availability for portfolio walkthrough.',
    outcome: 'NEUTRAL',
    createdHoursAgo: 16,
    isCompleted: true,
  },
  {
    requirementTitle: 'UI/UX Designer',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'FOLLOW_UP',
    summary: 'Portfolio review call scheduled with design lead.',
    outcome: 'PENDING',
    createdHoursAgo: 12,
    nextFollowUpOffsetHours: 10,
  },
  {
    requirementTitle: 'Cloud Architect',
    ownerEmail: 'rahul@magnuscopo.com',
    type: 'CALL',
    summary: 'Compensation alignment call completed for final offer stage.',
    outcome: 'POSITIVE',
    createdHoursAgo: 10,
    isCompleted: true,
  },
  {
    requirementTitle: 'Cloud Architect',
    ownerEmail: 'rahul@magnuscopo.com',
    type: 'FOLLOW_UP',
    summary: 'Offer approval pending final sign-off from finance team.',
    outcome: 'PENDING',
    createdHoursAgo: 8,
    nextFollowUpOffsetHours: -2,
  },
  {
    requirementTitle: 'QA Lead',
    ownerEmail: 'rahul@magnuscopo.com',
    type: 'STATUS_CHANGE',
    summary: 'Requirement moved to on hold pending budget reallocation.',
    outcome: 'NEUTRAL',
    createdHoursAgo: 36,
    isCompleted: true,
  },
  {
    requirementTitle: 'Business Analyst',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'MEETING',
    summary: 'Intake meeting completed with process and analytics stakeholders.',
    outcome: 'POSITIVE',
    createdHoursAgo: 26,
    isCompleted: true,
  },
  {
    requirementTitle: 'Business Analyst',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'FOLLOW_UP',
    summary: 'Follow-up set to confirm SQL case study timeline.',
    outcome: 'PENDING',
    createdHoursAgo: 14,
    nextFollowUpOffsetHours: 12,
  },
  {
    requirementTitle: 'Mobile Engineer',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'CALL',
    summary: 'Initial intake completed and role scope validated with client.',
    outcome: 'POSITIVE',
    createdHoursAgo: 15,
    isCompleted: true,
  },
  {
    requirementTitle: 'Backend Engineer',
    ownerEmail: 'priya@magnuscopo.com',
    type: 'STATUS_CHANGE',
    summary: 'Requirement closed after candidate joined successfully.',
    outcome: 'POSITIVE',
    createdHoursAgo: 120,
    isCompleted: true,
  },
]

const sampleLeads: LeadSeedData[] = [
  {
    companyName: 'CloudScale Partners',
    sourcePlatform: 'LinkedIn',
    sector: 'IT',
    confidenceScore: 82,
    status: 'NEW',
    contactName: 'Aparna Nair',
    contactEmail: 'aparna.nair@cloudscale.example',
  },
  {
    companyName: 'RetailMax Ventures',
    sourcePlatform: 'Naukri',
    sector: 'STARTUP',
    confidenceScore: 67,
    status: 'CONTACTED',
    contactName: 'Kunal Batra',
    contactEmail: 'kunal.batra@retailmax.example',
  },
  {
    companyName: 'ManufacturePro Works',
    sourcePlatform: 'LinkedIn',
    sector: 'CORE',
    confidenceScore: 74,
    status: 'QUALIFIED',
    contactName: 'Neha Choudhary',
    contactEmail: 'neha.choudhary@manufacturepro.example',
  },
  {
    companyName: 'Nova Education Labs',
    sourcePlatform: 'AngelList',
    sector: 'STARTUP',
    confidenceScore: 58,
    status: 'FOLLOW_UP',
    contactName: 'Ritesh Vaidya',
    contactEmail: 'ritesh.vaidya@novaedu.example',
  },
  {
    companyName: 'DataDriven Capital',
    sourcePlatform: 'LinkedIn',
    sector: 'ENTERPRISE',
    confidenceScore: 49,
    status: 'STALLED',
    contactName: 'Megha Arora',
    contactEmail: 'megha.arora@datadriven.example',
  },
]

const sampleTemplates: TemplateSeedData[] = [
  {
    name: 'JD Request',
    category: 'JD_REQUEST',
    subject: 'Request for Job Description - {{jobTitle}}',
    body: 'Dear {{contactName}},\n\nThank you for partnering with us on the {{jobTitle}} role at {{companyName}}.\n\nPlease share the complete JD with role objectives, core responsibilities, and preferred background.\n\nThis will help us begin focused sourcing immediately.\n\nRegards,\nMagnus Copo Team',
  },
  {
    name: 'Candidate Submission',
    category: 'CANDIDATE_SUBMISSION',
    subject: 'Candidate Profile: {{candidateName}} for {{jobTitle}} - {{mmdId}}',
    body: 'Dear {{contactName}},\n\nPlease find candidate {{candidateName}} for {{jobTitle}} ({{mmdId}}).\n\nProfile snapshot:\n- Experience: {{experience}} years\n- Current Company: {{currentCompany}}\n- Notice Period: {{noticePeriod}}\n\nKindly review and share feedback.\n\nRegards,\nMagnus Copo Team',
  },
  {
    name: 'Interview Scheduling',
    category: 'INTERVIEW_SCHEDULING',
    subject: 'Interview Confirmation: {{candidateName}} - {{interviewDate}}',
    body: 'Dear {{candidateName}},\n\nYour interview for {{jobTitle}} at {{companyName}} is confirmed.\n\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nMode: {{location}}\nRound: {{interviewRound}}\n\nPlease confirm your availability.\n\nRegards,\nMagnus Copo Team',
  },
  {
    name: 'Follow-up Reminder',
    category: 'FOLLOW_UP',
    subject: 'Follow-up on {{jobTitle}} - {{mmdId}}',
    body: 'Dear {{contactName}},\n\nFollowing up on {{jobTitle}} ({{mmdId}}).\n\nPlease share updates on submitted candidates, interview feedback, and next steps.\n\nRegards,\nMagnus Copo Team',
  },
]

function getDeletedCount(result: { deletedCount?: number }): number {
  return result.deletedCount ?? 0
}

function buildCandidateMilestones(status: CandidateStatus, appliedAt: Date): {
  shortlistedAt?: Date
  interviewedAt?: Date
  offeredAt?: Date
  joinedAt?: Date
  rejectedAt?: Date
} {
  const milestones: {
    shortlistedAt?: Date
    interviewedAt?: Date
    offeredAt?: Date
    joinedAt?: Date
    rejectedAt?: Date
  } = {}

  if (status === 'SHORTLISTED' || status === 'INTERVIEWED' || status === 'OFFERED' || status === 'JOINED') {
    milestones.shortlistedAt = addDays(appliedAt, 2)
  }

  if (status === 'INTERVIEWED' || status === 'OFFERED' || status === 'JOINED') {
    milestones.interviewedAt = addDays(appliedAt, 5)
  }

  if (status === 'OFFERED' || status === 'JOINED') {
    milestones.offeredAt = addDays(appliedAt, 8)
  }

  if (status === 'JOINED') {
    milestones.joinedAt = addDays(appliedAt, 14)
  }

  if (status === 'REJECTED') {
    milestones.rejectedAt = addDays(appliedAt, 6)
  }

  return milestones
}

async function generateMmdId(sector: Sector, createdAt: Date): Promise<string> {
  const prefix = getRequirementIdPrefix(sector, createdAt)
  const count = await Requirement.countDocuments({ mmdId: { $regex: `^${prefix}-` } })
  return formatMmdId(sector, createdAt, count + 1)
}

async function cleanupLegacySyntheticArtifacts(): Promise<CleanupStats> {
  const syntheticRequirements = await Requirement.find({
    $or: [
      { jobTitle: SYNTHETIC_ROLE_TITLE_REGEX },
      { fullDescription: /synthetic requirement generated for uat coverage/i },
    ],
  })
    .select('_id')
    .lean()

  const syntheticRequirementIds = syntheticRequirements.map((req) => req._id)

  const activityFilter = syntheticRequirementIds.length > 0
    ? {
      $or: [
        { summary: SYNTHETIC_ACTIVITY_SUMMARY_REGEX },
        { requirementId: { $in: syntheticRequirementIds } },
      ],
    }
    : { summary: SYNTHETIC_ACTIVITY_SUMMARY_REGEX }

  const candidateFilter = syntheticRequirementIds.length > 0
    ? {
      $or: [
        { email: LEGACY_FAKE_CANDIDATE_EMAIL_REGEX },
        { requirementId: { $in: syntheticRequirementIds } },
      ],
    }
    : { email: LEGACY_FAKE_CANDIDATE_EMAIL_REGEX }

  const [deletedActivities, deletedCandidates, deletedRequirements] = await Promise.all([
    Activity.deleteMany(activityFilter),
    Candidate.deleteMany(candidateFilter),
    syntheticRequirementIds.length > 0
      ? Requirement.deleteMany({ _id: { $in: syntheticRequirementIds } })
      : Promise.resolve({ deletedCount: 0 }),
  ])

  return {
    activitiesRemoved: getDeletedCount(deletedActivities),
    candidatesRemoved: getDeletedCount(deletedCandidates),
    requirementsRemoved: getDeletedCount(deletedRequirements),
  }
}

async function seedUsers(): Promise<{ userIds: Record<string, string>; stats: SeedMutationStats }> {
  const userIds: Record<string, string> = {}
  let created = 0
  let updated = 0

  for (const userData of defaultUsers) {
    const email = userData.email.toLowerCase()
    const existing = await User.findOne({ email })
    const hashedPassword = await hash(userData.password, 12)

    if (existing) {
      existing.set({
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        isActive: true,
        deletedAt: null,
      })
      await existing.save()
      userIds[email] = existing._id.toString()
      updated += 1
      continue
    }

    const createdUser = await User.create({
      email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role,
      isActive: true,
      deletedAt: null,
    })

    userIds[email] = createdUser._id.toString()
    created += 1
  }

  return { userIds, stats: { created, updated } }
}

async function seedCompanies(userIds: Record<string, string>): Promise<{ companies: Map<string, SeededCompanyRef>; stats: SeedMutationStats }> {
  const companies = new Map<string, SeededCompanyRef>()
  let created = 0
  let updated = 0

  for (const companyData of sampleCompanies) {
    const coordinatorId = userIds[companyData.assignedCoordinatorEmail.toLowerCase()]
    if (!coordinatorId) {
      throw new Error(`Coordinator missing for company seed: ${companyData.name}`)
    }

    const existing = await Company.findOne({
      name: companyData.name,
      location: companyData.location,
      deletedAt: null,
    })

    if (existing) {
      existing.set({
        category: companyData.category,
        sector: companyData.sector,
        website: companyData.website,
        hiringType: companyData.hiringType,
        source: companyData.source,
        mouStatus: companyData.mouStatus,
        mouStartDate: companyData.mouStartDate,
        mouEndDate: companyData.mouEndDate,
        commercialPercent: companyData.commercialPercent,
        assignedCoordinatorId: coordinatorId,
        deletedAt: null,
      })
      await existing.save()

      companies.set(companyData.name, {
        id: existing._id.toString(),
        sector: existing.sector as Sector,
      })
      updated += 1
      continue
    }

    const createdCompany = await Company.create({
      name: companyData.name,
      category: companyData.category,
      sector: companyData.sector,
      location: companyData.location,
      website: companyData.website,
      hiringType: companyData.hiringType,
      source: companyData.source,
      mouStatus: companyData.mouStatus,
      mouStartDate: companyData.mouStartDate,
      mouEndDate: companyData.mouEndDate,
      commercialPercent: companyData.commercialPercent,
      assignedCoordinatorId: coordinatorId,
      deletedAt: null,
    })

    companies.set(companyData.name, {
      id: createdCompany._id.toString(),
      sector: createdCompany.sector as Sector,
    })
    created += 1
  }

  return { companies, stats: { created, updated } }
}

async function seedRequirements(
  companies: Map<string, SeededCompanyRef>,
  userIds: Record<string, string>
): Promise<{ requirements: Map<string, SeededRequirementRef>; stats: SeedMutationStats }> {
  const requirements = new Map<string, SeededRequirementRef>()
  let created = 0
  let updated = 0

  for (const reqData of sampleRequirements) {
    const companyRef = companies.get(reqData.companyName)
    if (!companyRef) {
      throw new Error(`Company missing for requirement seed: ${reqData.jobTitle}`)
    }

    const ownerId = userIds[reqData.ownerEmail.toLowerCase()]
    if (!ownerId) {
      throw new Error(`Owner missing for requirement seed: ${reqData.jobTitle}`)
    }

    const existing = await Requirement.findOne({
      companyId: companyRef.id,
      jobTitle: reqData.jobTitle,
      deletedAt: null,
    })

    const payload = {
      companyId: companyRef.id,
      jobTitle: reqData.jobTitle,
      fullDescription: reqData.fullDescription,
      skills: reqData.skills,
      experienceMin: reqData.experienceMin,
      experienceMax: reqData.experienceMax,
      salaryMin: reqData.salaryMin,
      salaryMax: reqData.salaryMax,
      openings: reqData.openings,
      workMode: reqData.workMode,
      location: reqData.location,
      priority: reqData.priority,
      group: reqData.group,
      accountOwnerId: ownerId,
      status: reqData.status,
      deletedAt: null,
    }

    if (existing) {
      existing.set(payload)
      await existing.save()

      requirements.set(reqData.jobTitle, {
        id: existing._id.toString(),
        mmdId: existing.mmdId,
      })
      updated += 1
      continue
    }

    const createdAt = subDays(new Date(), reqData.createdDaysAgo)
    const mmdId = await generateMmdId(companyRef.sector, createdAt)

    const createdRequirement = await Requirement.create({
      ...payload,
      mmdId,
      createdAt,
    })

    requirements.set(reqData.jobTitle, {
      id: createdRequirement._id.toString(),
      mmdId: createdRequirement.mmdId,
    })
    created += 1
  }

  return { requirements, stats: { created, updated } }
}

async function seedCandidates(requirements: Map<string, SeededRequirementRef>): Promise<SeedMutationStats> {
  let created = 0
  let updated = 0

  for (const candidateData of sampleCandidates) {
    const requirement = requirements.get(candidateData.requirementTitle)
    if (!requirement) {
      continue
    }

    const appliedAt = subDays(new Date(), candidateData.daysAgoApplied)
    const milestones = buildCandidateMilestones(candidateData.status, appliedAt)

    const payload = {
      name: candidateData.name,
      email: candidateData.email.toLowerCase(),
      phone: candidateData.phone,
      skills: candidateData.skills,
      yearsExperience: candidateData.yearsExperience,
      status: candidateData.status,
      appliedAt,
      ...milestones,
      deletedAt: null,
    }

    const existing = await Candidate.findOne({
      requirementId: requirement.id,
      email: candidateData.email.toLowerCase(),
      deletedAt: null,
    })

    if (existing) {
      existing.set(payload)
      await existing.save()
      updated += 1
      continue
    }

    await Candidate.create({
      requirementId: requirement.id,
      ...payload,
    })
    created += 1
  }

  return { created, updated }
}

async function seedActivities(
  requirements: Map<string, SeededRequirementRef>,
  userIds: Record<string, string>
): Promise<SeedMutationStats> {
  let created = 0
  let updated = 0

  for (const activityData of sampleActivities) {
    const requirement = requirements.get(activityData.requirementTitle)
    if (!requirement) {
      continue
    }

    const ownerId = userIds[activityData.ownerEmail.toLowerCase()]
    if (!ownerId) {
      continue
    }

    const createdAt = subHours(new Date(), activityData.createdHoursAgo)
    const nextFollowUpDate = typeof activityData.nextFollowUpOffsetHours === 'number'
      ? addHours(new Date(), activityData.nextFollowUpOffsetHours)
      : null

    const payload = {
      type: activityData.type,
      summary: activityData.summary,
      outcome: activityData.outcome,
      userId: ownerId,
      nextFollowUpDate,
      isCompleted: activityData.isCompleted ?? false,
      createdAt,
    }

    const existing = await Activity.findOne({
      requirementId: requirement.id,
      summary: activityData.summary,
    })

    if (existing) {
      existing.set(payload)
      await existing.save()
      updated += 1
      continue
    }

    await Activity.create({
      requirementId: requirement.id,
      ...payload,
    })
    created += 1
  }

  return { created, updated }
}

async function seedLeads(scraperId: string): Promise<SeedMutationStats> {
  let created = 0
  let updated = 0

  for (const leadData of sampleLeads) {
    const existing = await Lead.findOne({
      companyName: leadData.companyName,
      deletedAt: null,
    })

    const payload = {
      sourcePlatform: leadData.sourcePlatform,
      companyName: leadData.companyName,
      sector: leadData.sector,
      confidenceScore: leadData.confidenceScore,
      status: leadData.status,
      assignedTo: scraperId,
      contactName: leadData.contactName,
      contactEmail: leadData.contactEmail,
      deletedAt: null,
    }

    if (existing) {
      existing.set(payload)
      await existing.save()
      updated += 1
      continue
    }

    await Lead.create(payload)
    created += 1
  }

  return { created, updated }
}

async function seedTemplates(adminId: string): Promise<SeedMutationStats> {
  let created = 0
  let updated = 0

  for (const templateData of sampleTemplates) {
    const existing = await Template.findOne({ name: templateData.name })
    const payload = {
      name: templateData.name,
      category: templateData.category,
      subject: templateData.subject,
      body: templateData.body,
      createdBy: adminId,
      isPublic: true,
      variables: Array.from(templateData.body.matchAll(/\{\{(\w+)\}\}/g)).map((match) => match[1]),
    }

    if (existing) {
      existing.set(payload)
      await existing.save()
      updated += 1
      continue
    }

    await Template.create(payload)
    created += 1
  }

  return { created, updated }
}

function printSummary(input: {
  cleanup: CleanupStats
  users: SeedMutationStats
  companies: SeedMutationStats
  requirements: SeedMutationStats
  candidates: SeedMutationStats
  activities: SeedMutationStats
  leads: SeedMutationStats
  templates: SeedMutationStats
}): void {
  console.log('Database seed complete.')
  console.log('')
  console.log('Cleanup (legacy synthetic records):')
  console.log(`  requirements removed: ${input.cleanup.requirementsRemoved}`)
  console.log(`  activities removed: ${input.cleanup.activitiesRemoved}`)
  console.log(`  candidates removed: ${input.cleanup.candidatesRemoved}`)
  console.log('')
  console.log('Seed mutations:')
  console.log(`  users: created ${input.users.created}, updated ${input.users.updated}`)
  console.log(`  companies: created ${input.companies.created}, updated ${input.companies.updated}`)
  console.log(`  requirements: created ${input.requirements.created}, updated ${input.requirements.updated}`)
  console.log(`  candidates: created ${input.candidates.created}, updated ${input.candidates.updated}`)
  console.log(`  activities: created ${input.activities.created}, updated ${input.activities.updated}`)
  console.log(`  leads: created ${input.leads.created}, updated ${input.leads.updated}`)
  console.log(`  templates: created ${input.templates.created}, updated ${input.templates.updated}`)
}

async function seed(): Promise<void> {
  await connectDB()

  const cleanupStats = await cleanupLegacySyntheticArtifacts()

  const { userIds, stats: userStats } = await seedUsers()
  const { companies, stats: companyStats } = await seedCompanies(userIds)
  const { requirements, stats: requirementStats } = await seedRequirements(companies, userIds)

  const candidateStats = await seedCandidates(requirements)
  const activityStats = await seedActivities(requirements, userIds)

  const scraperId = userIds['scraper@magnuscopo.com']
  const adminId = userIds['admin@magnuscopo.com']

  if (!scraperId || !adminId) {
    throw new Error('Required default users are missing after seeding users')
  }

  const leadStats = await seedLeads(scraperId)
  const templateStats = await seedTemplates(adminId)

  printSummary({
    cleanup: cleanupStats,
    users: userStats,
    companies: companyStats,
    requirements: requirementStats,
    candidates: candidateStats,
    activities: activityStats,
    leads: leadStats,
    templates: templateStats,
  })
}

async function main(): Promise<void> {
  try {
    await seed()
    process.exit(0)
  } catch (error: unknown) {
    console.error('Database seeding failed.', error)
    process.exit(1)
  }
}

void main()