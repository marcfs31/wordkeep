import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDue,
  hashHue,
  isRtl,
  languageLine,
  nativeLanguageName,
  statusLabel,
  trailModifierLabel,
  trailModifierPressed,
} from './format'

describe('format helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects RTL language codes including region tags', () => {
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('he-IL')).toBe(true)
    expect(isRtl('en')).toBe(false)
  })

  it('formats due dates relative to now', () => {
    const now = Date.parse('2026-09-02T12:00:00Z')
    expect(formatDue(now - 1000, now)).toBe('due now')
    expect(formatDue(now + 5 * 60_000, now)).toBe('in 5m')
    expect(formatDue(now + 5 * 3600_000, now)).toBe('in 5h')
    expect(formatDue(now + 3 * 86_400_000, now)).toBe('in 3d')
  })

  it('maps recall status labels', () => {
    expect(statusLabel('new')).toBe('new')
    expect(statusLabel('mastered')).toBe('kept')
    expect(statusLabel('other')).toBe('other')
  })

  it('builds a language line from Intl when possible', () => {
    expect(nativeLanguageName('en', 'English', 'en')).toBe('English')
    expect(languageLine('en', 'English', 'en')).toMatch(/en/)
  })

  it('uses Control on Apple platforms and Alt elsewhere', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: 'Mac OS X' })
    expect(trailModifierLabel()).toBe('Control')
    expect(
      trailModifierPressed({ ctrlKey: true, metaKey: false, altKey: false } as KeyboardEvent),
    ).toBe(true)

    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Windows' })
    expect(trailModifierLabel()).toBe('Alt')
    expect(
      trailModifierPressed({ altKey: true, ctrlKey: false, metaKey: false } as KeyboardEvent),
    ).toBe(true)
  })

  it('hashes language codes into a hue bucket', () => {
    expect(hashHue('en')).toBeGreaterThanOrEqual(0)
    expect(hashHue('en')).toBeLessThan(360)
    expect(hashHue('en')).toBe(hashHue('en'))
    expect(hashHue('es')).not.toBe(hashHue('de'))
  })
})
