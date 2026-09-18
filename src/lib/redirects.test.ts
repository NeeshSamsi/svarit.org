import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCampaignRedirects, type CampaignRedirect } from './redirects.ts'

const internal: CampaignRedirect = {
  source: '/centenary-ig',
  note: 'Instagram bio link for the centenary launch, Sep 2026',
  destination: '/centenary',
  utm: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'centenary',
  },
}

const external: CampaignRedirect = {
  source: '/centenary-form',
  note: 'QR code on the centenary poster, Sep 2026',
  destination: 'https://umami.neeshsamsi.com/q/centenary-form',
}

describe('buildCampaignRedirects', () => {
  it('appends utm params to an internal destination', () => {
    const [result] = buildCampaignRedirects([internal])
    assert.equal(
      result.destination,
      '/centenary?utm_source=instagram&utm_medium=social&utm_campaign=centenary'
    )
  })

  it('includes utm_content when given', () => {
    const [result] = buildCampaignRedirects([
      { ...internal, utm: { ...internal.utm, utm_content: 'bio' } },
    ])
    assert.match(result.destination, /utm_content=bio$/)
  })

  it('preserves a query already on the destination', () => {
    const [result] = buildCampaignRedirects([
      { ...internal, destination: '/initiatives?tab=events' },
    ])
    assert.equal(
      result.destination,
      '/initiatives?tab=events&utm_source=instagram&utm_medium=social&utm_campaign=centenary'
    )
  })

  it('passes an Umami Link destination through unchanged', () => {
    const [result] = buildCampaignRedirects([external])
    assert.equal(result.destination, external.destination)
  })

  it('is always permanent: false', () => {
    const results = buildCampaignRedirects([internal, external])
    assert.equal(results[0].permanent, false)
    assert.equal(results[1].permanent, false)
  })

  it('throws for a source not starting with a slash', () => {
    assert.throws(() =>
      buildCampaignRedirects([{ ...internal, source: 'centenary-ig' }])
    )
  })

  it('throws for a source that is not lowercase kebab-case', () => {
    assert.throws(() =>
      buildCampaignRedirects([{ ...internal, source: '/Centenary_IG' }])
    )
  })

  it('throws for a duplicate source', () => {
    assert.throws(() =>
      buildCampaignRedirects([
        internal,
        { ...external, source: internal.source },
      ])
    )
  })

  it('throws for an external destination that is not an Umami Link', () => {
    const badExternal = {
      ...external,
      destination: 'https://forms.google.com/xyz',
    } as unknown as CampaignRedirect

    assert.throws(() => buildCampaignRedirects([badExternal]))
  })

  it('throws for an internal destination missing a utm field', () => {
    assert.throws(() =>
      buildCampaignRedirects([
        {
          ...internal,
          utm: { ...internal.utm, utm_campaign: '' },
        },
      ])
    )
  })
})
