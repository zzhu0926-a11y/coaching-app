export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

export interface PhaseInfo {
  phase: CyclePhase
  dayOfCycle: number
  daysRemaining: number
  tip: string
  emoji: string
  color: string
  bgColor: string
}

const PHASE_TIPS: Record<CyclePhase, string> = {
  menstrual: 'Low energy phase — prioritize iron-rich foods, rest, and light movement.',
  follicular: 'Rising estrogen — great week for strength training and higher carbs.',
  ovulatory: 'Peak energy and strength — ideal time for HIIT and hitting PRs.',
  luteal: 'Higher calorie needs — lean into complex carbs and moderate training.',
}

const PHASE_EMOJIS: Record<CyclePhase, string> = {
  menstrual: '🩸',
  follicular: '🌱',
  ovulatory: '⚡',
  luteal: '🌙',
}

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstrual: 'text-rose-400',
  follicular: 'text-sky-400',
  ovulatory: 'text-purple-400',
  luteal: 'text-amber-400',
}

const PHASE_BG: Record<CyclePhase, string> = {
  menstrual: 'bg-rose-950/40 border-rose-800/40',
  follicular: 'bg-sky-950/40 border-sky-800/40',
  ovulatory: 'bg-purple-950/40 border-purple-800/40',
  luteal: 'bg-amber-950/40 border-amber-800/40',
}

export function getPhaseFromDay(dayOfCycle: number): CyclePhase {
  if (dayOfCycle <= 5) return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 16) return 'ovulatory'
  return 'luteal'
}

export function getPhaseDuration(phase: CyclePhase): number {
  return { menstrual: 5, follicular: 8, ovulatory: 3, luteal: 12 }[phase]
}

export function getPhaseEndDay(phase: CyclePhase): number {
  return { menstrual: 5, follicular: 13, ovulatory: 16, luteal: 28 }[phase]
}

export function getCurrentPhase(
  cycleStartDate: string,
  cycleLengthDays = 28
): PhaseInfo | null {
  if (!cycleStartDate) return null

  const start = new Date(cycleStartDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Cycle day (1-indexed, wraps after cycleLengthDays)
  const dayOfCycle = (diffDays % cycleLengthDays) + 1

  const phase = getPhaseFromDay(dayOfCycle)
  const phaseEndDay = getPhaseEndDay(phase)
  const daysRemaining = phaseEndDay - dayOfCycle

  return {
    phase,
    dayOfCycle,
    daysRemaining,
    tip: PHASE_TIPS[phase],
    emoji: PHASE_EMOJIS[phase],
    color: PHASE_COLORS[phase],
    bgColor: PHASE_BG[phase],
  }
}

export function getPhaseLabel(phase: CyclePhase): string {
  return {
    menstrual: 'Menstrual Phase',
    follicular: 'Follicular Phase',
    ovulatory: 'Ovulatory Phase',
    luteal: 'Luteal Phase',
  }[phase]
}

// Given 4-week log data, compute phase coverage per week
export function getCyclePhasesSummary(
  cycleStartDate: string | null,
  weeksAgo: number,
  cycleLengthDays = 28
): string {
  if (!cycleStartDate) return 'No cycle data recorded'

  const start = new Date(cycleStartDate)
  const today = new Date()
  const summary: string[] = []

  for (let w = weeksAgo - 1; w >= 0; w--) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (w + 1) * 7)
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() - w * 7)

    const phasesInWeek = new Set<string>()
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      const diff = Math.floor((day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (diff < 0) continue
      const cycleDay = (diff % cycleLengthDays) + 1
      phasesInWeek.add(getPhaseFromDay(cycleDay))
    }

    const weekNum = weeksAgo - w
    summary.push(`Week ${weekNum}: ${Array.from(phasesInWeek).join(' + ')}`)
  }

  return summary.join(', ')
}
