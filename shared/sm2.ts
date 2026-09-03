import type { Grade, RecallStatus } from './types.ts'

export type RecallState = {
  easeFactor: number
  intervalDays: number
  repetitions: number
  dueAt: number
  lastReviewedAt: number | null
  status: RecallStatus
}

const MINUTE = 60_000
const DAY = 86_400_000

export function initialRecall(now = Date.now()): RecallState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now,
    lastReviewedAt: null,
    status: 'new',
  }
}

export function applyGrade(
  state: RecallState,
  grade: Grade,
  now = Date.now(),
): RecallState {
  let { easeFactor, intervalDays, repetitions } = state

  if (grade === 'again') {
    return {
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      intervalDays: 1 / 1440,
      repetitions: 0,
      dueAt: now + MINUTE,
      lastReviewedAt: now,
      status: 'learning',
    }
  }

  if (repetitions === 0) {
    intervalDays = grade === 'easy' ? 4 : 1
  } else if (repetitions === 1) {
    intervalDays = grade === 'easy' ? 10 : grade === 'hard' ? 3 : 6
  } else if (grade === 'hard') {
    intervalDays = Math.max(1, intervalDays * 1.2)
  } else if (grade === 'easy') {
    intervalDays = intervalDays * easeFactor * 1.3
  } else {
    intervalDays = intervalDays * easeFactor
  }

  if (grade === 'hard') easeFactor = Math.max(1.3, easeFactor - 0.15)
  if (grade === 'easy') easeFactor += 0.15

  repetitions += 1
  const status: RecallStatus =
    intervalDays >= 21 ? 'mastered' : repetitions < 2 ? 'learning' : 'review'

  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueAt: now + Math.round(intervalDays * DAY),
    lastReviewedAt: now,
    status,
  }
}

export function previewInterval(state: RecallState, grade: Grade, now = Date.now()): string {
  return formatInterval(applyGrade(state, grade, now).intervalDays, grade)
}

export function formatInterval(days: number, grade?: Grade): string {
  if (grade === 'again' || days < 1 / 24) {
    const minutes = Math.max(1, Math.round(days * 1440))
    if (minutes < 60) return `${minutes}m`
    return `${Math.round(minutes / 60)}h`
  }
  if (days < 30) return `${Math.max(1, Math.round(days))}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}y`
}

export function recallStateFrom(word: {
  easeFactor: number
  intervalDays: number
  repetitions: number
  dueAt: number
  lastReviewedAt: number | null
  status: RecallStatus
}): RecallState {
  return {
    easeFactor: word.easeFactor,
    intervalDays: word.intervalDays,
    repetitions: word.repetitions,
    dueAt: word.dueAt,
    lastReviewedAt: word.lastReviewedAt,
    status: word.status,
  }
}
