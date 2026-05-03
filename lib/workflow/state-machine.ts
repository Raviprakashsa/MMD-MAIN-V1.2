import { RequirementStatus } from '@/lib/db/models/Requirement'

const transitions: Record<RequirementStatus, RequirementStatus[]> = {
  PENDING_INTAKE: ['AWAITING_JD', 'ON_HOLD'],
  AWAITING_JD: ['ACTIVE', 'ON_HOLD', 'CLOSED_NOT_HIRED'],
  ACTIVE: ['SOURCING', 'ON_HOLD', 'CLOSED_NOT_HIRED'],
  SOURCING: ['INTERVIEWING', 'ON_HOLD', 'CLOSED_NOT_HIRED'],
  INTERVIEWING: ['OFFER', 'CLOSED_NOT_HIRED', 'ON_HOLD'],
  OFFER: ['CLOSED_HIRED', 'CLOSED_NOT_HIRED', 'ON_HOLD'],
  ON_HOLD: ['ACTIVE', 'CLOSED_NOT_HIRED'],
  CLOSED_HIRED: [],
  CLOSED_NOT_HIRED: [],
}

export class RequirementStateMachine {
  canTransition(from: RequirementStatus, to: RequirementStatus): boolean {
    return transitions[from]?.includes(to) ?? false
  }

  getNextStates(current: RequirementStatus): RequirementStatus[] {
    return transitions[current] ?? []
  }
}

export const terminalStates: RequirementStatus[] = ['CLOSED_HIRED', 'CLOSED_NOT_HIRED']
