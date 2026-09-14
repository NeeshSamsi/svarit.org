import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { newsletterEventTypeSchema } from './newsletter.ts'

describe('newsletterEventTypeSchema', () => {
  it('passes an allowed event type through unchanged', () => {
    assert.equal(newsletterEventTypeSchema.parse('$opt.in'), '$opt.in')
    assert.equal(
      newsletterEventTypeSchema.parse('$opt.in.centenary'),
      '$opt.in.centenary'
    )
  })

  it('falls back to $opt.in for a disallowed or spoofed value', () => {
    assert.equal(newsletterEventTypeSchema.parse('$opt.in.hacked'), '$opt.in')
    assert.equal(newsletterEventTypeSchema.parse('admin'), '$opt.in')
  })

  it('falls back to $opt.in for an empty or missing value', () => {
    assert.equal(newsletterEventTypeSchema.parse(''), '$opt.in')
    assert.equal(newsletterEventTypeSchema.parse(undefined), '$opt.in')
  })

  it('falls back to $opt.in for a null signup_event_type from a slice', () => {
    assert.equal(newsletterEventTypeSchema.parse(null), '$opt.in')
  })
})
