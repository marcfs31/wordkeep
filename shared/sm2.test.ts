import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyGrade, formatInterval, initialRecall, previewInterval, recallStateFrom } from './sm2.ts'

const NOW = Date.parse('2026-09-02T12:00:00Z')

describe('SM-2', () => {
  it('new cards are due immediately', () => {
    const card = initialRecall(NOW)
    assert.equal(card.status, 'new')
    assert.equal(card.dueAt, NOW)
  })

  it('Again returns the card in about a minute and resets repetitions', () => {
    const started = applyGrade(initialRecall(NOW), 'good', NOW)
    const again = applyGrade(started, 'again', NOW + 1000)
    assert.equal(again.repetitions, 0)
    assert.equal(again.status, 'learning')
    assert.equal(again.dueAt, NOW + 1000 + 60_000)
  })

  it('Good on a new card schedules ~1 day', () => {
    const next = applyGrade(initialRecall(NOW), 'good', NOW)
    assert.equal(next.intervalDays, 1)
    assert.equal(next.status, 'learning')
    assert.equal(next.dueAt, NOW + 86_400_000)
  })

  it('second Good schedules ~6 days and moves to review', () => {
    const first = applyGrade(initialRecall(NOW), 'good', NOW)
    const second = applyGrade(first, 'good', NOW)
    assert.equal(second.intervalDays, 6)
    assert.equal(second.status, 'review')
  })

  it('Easy grows ease and interval', () => {
    const first = applyGrade(initialRecall(NOW), 'easy', NOW)
    assert.equal(first.intervalDays, 4)
    assert.ok(first.easeFactor > 2.5)
  })

  it('long successful reviews become mastered', () => {
    let card = initialRecall(NOW)
    for (let i = 0; i < 6; i += 1) {
      card = applyGrade(card, 'good', NOW)
    }
    assert.equal(card.status, 'mastered')
    assert.ok(card.intervalDays >= 21)
  })

  it('Hard on a new card uses a one-day interval and lowers ease', () => {
    const next = applyGrade(initialRecall(NOW), 'hard', NOW)
    assert.equal(next.intervalDays, 1)
    assert.ok(next.easeFactor < 2.5)
    assert.equal(next.status, 'learning')
  })

  it('formats preview intervals', () => {
    assert.equal(formatInterval(0, 'again'), '1m')
    assert.equal(formatInterval(1), '1d')
    assert.equal(formatInterval(45), '2mo')
    assert.equal(previewInterval(initialRecall(NOW), 'again', NOW), '1m')
  })

  it('copies recall fields from a stored word', () => {
    const state = recallStateFrom({
      easeFactor: 2.6,
      intervalDays: 6,
      repetitions: 2,
      dueAt: NOW,
      lastReviewedAt: NOW,
      status: 'review',
    })
    assert.equal(state.status, 'review')
    assert.equal(state.intervalDays, 6)
  })
})
