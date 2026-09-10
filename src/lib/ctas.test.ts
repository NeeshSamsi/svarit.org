import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { initiativeCtas } from './ctas.ts'
import type { EventDocument } from '../../prismicio-types'
import type { EventDocumentDataCtasItem } from '../../prismicio-types'

function makeEvent(
  ctas: Partial<EventDocumentDataCtasItem>[],
  url: string | null = '/initiatives/dinarang-smriti'
): EventDocument {
  return {
    url,
    data: {
      ctas: ctas.map((row) => ({
        label: null,
        link: { link_type: 'Any' },
        style: null,
        ...row,
      })),
    },
  } as unknown as EventDocument
}

const filledLink = { link_type: 'Web', url: 'https://example.com' } as const

describe('initiativeCtas', () => {
  it('falls back to Learn more pointed at the event url when the group is empty', () => {
    const event = makeEvent([])
    assert.deepEqual(initiativeCtas(event), [
      {
        label: 'Learn more',
        field: null,
        href: '/initiatives/dinarang-smriti',
        variant: 'secondary',
      },
    ])
  })

  it('a filled row wins over the fallback', () => {
    const event = makeEvent([
      { label: 'Register now', link: filledLink, style: 'Outlined' },
    ])
    const result = initiativeCtas(event)
    assert.equal(result.length, 1)
    assert.equal(result[0].label, 'Register now')
    assert.equal(result[0].field, filledLink)
    assert.equal(result[0].href, null)
  })

  it('a row with a blank label gets Learn more', () => {
    const event = makeEvent([{ label: '   ', link: filledLink }])
    assert.equal(initiativeCtas(event)[0].label, 'Learn more')
  })

  it('a row with an empty link is skipped', () => {
    const event = makeEvent([
      { label: 'Ghost', link: { link_type: 'Any' } },
      { label: 'Register now', link: filledLink },
    ])
    const result = initiativeCtas(event)
    assert.equal(result.length, 1)
    assert.equal(result[0].label, 'Register now')
  })

  it('Primary maps to variant primary', () => {
    const event = makeEvent([
      { label: 'Register now', link: filledLink, style: 'Primary' },
    ])
    assert.equal(initiativeCtas(event)[0].variant, 'primary')
  })

  it('anything other than Primary maps to variant secondary', () => {
    const event = makeEvent([{ label: 'Register now', link: filledLink }])
    assert.equal(initiativeCtas(event)[0].variant, 'secondary')
  })
})
