export const EventPhase = {
  Prep: "prep",
  Onboard: "onboard",
  Engage: "engage",
  Live: "live",
  Wrapup: "wrapup",
} as const

export type EventPhase = (typeof EventPhase)[keyof typeof EventPhase]

export const PhaseLabels: Record<EventPhase, string> = {
  [EventPhase.Prep]: "Preparation",
  [EventPhase.Onboard]: "Onboarding",
  [EventPhase.Engage]: "Engagement",
  [EventPhase.Live]: "Live Event",
  [EventPhase.Wrapup]: "Wrap-up",
}

export const PhaseTransitions: Record<EventPhase, EventPhase[]> = {
  [EventPhase.Prep]: [EventPhase.Onboard],
  [EventPhase.Onboard]: [EventPhase.Engage, EventPhase.Prep],
  [EventPhase.Engage]: [EventPhase.Live, EventPhase.Onboard],
  [EventPhase.Live]: [EventPhase.Wrapup, EventPhase.Engage],
  [EventPhase.Wrapup]: [],
}

export function canTransition(from: EventPhase, to: EventPhase): boolean {
  return PhaseTransitions[from].includes(to)
}

export interface PhaseMetadata {
  prep?: {
    sectorsConfigured?: number
    categoriesCreated?: number
    athletesRegistered?: number
  }
  onboard?: {
    ticketsIssued?: number
    invitationsSent?: number
    participantsRegistered?: number
  }
  engage?: {
    activePolls?: number
    merchOrders?: number
    chatMessages?: number
  }
  live?: {
    streamStartTime?: string
    peakViewers?: number
    activeJudges?: number
    attemptsRecorded?: number
  }
  wrapup?: {
    recordingsArchived?: boolean
    feedbackCollected?: boolean
    paymentsFinalized?: boolean
  }
}

export interface PhaseTransitionResult {
  success: boolean
  currentPhase: EventPhase
  message?: string
}
