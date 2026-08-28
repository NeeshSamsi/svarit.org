import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildDraft,
  collectMentions,
  levenshtein,
  normaliseName,
} from './lib/artists.ts'
import type { ContentEvent } from './lib/content.ts'

function event(title: string, description: string): ContentEvent {
  return {
    date: { date: '2014-02-14', label: '14th February 2014' },
    title,
    description,
  }
}

function namesOf(description: string): string[] {
  return collectMentions([event('Test', description)]).map(
    (mention) => mention.name
  )
}

function mentionFor(description: string, name: string) {
  return collectMentions([event('Test', description)]).find(
    (mention) => mention.name === name
  )
}

describe('honorific extraction', () => {
  it('splits the honorific off the display name', () => {
    const mention = mentionFor(
      'a Sitar recital by Pt. Kushal Das.',
      'Kushal Das'
    )
    assert.equal(mention?.honorific, 'Pt.')
    assert.equal(mention?.name, 'Kushal Das')
  })

  it('handles every honorific in the source data', () => {
    const cases: [string, string, string][] = [
      ['vocal by Pandit Dinkar Kaikini.', 'Pandit', 'Dinkar Kaikini'],
      ['Kathak by Smt Shama Bhate.', 'Smt', 'Shama Bhate'],
      ['a Tabla solo by Ustad Zakir Hussain.', 'Ustad', 'Zakir Hussain'],
      ['conducted by Vidushi Aditi Upadhya.', 'Vidushi', 'Aditi Upadhya'],
      [
        'a Sitar recital by Shri Purbayan Chatterjee.',
        'Shri',
        'Purbayan Chatterjee',
      ],
      [
        'a workshop with Vidwan Karaikudi Mani Iyer.',
        'Vidwan',
        'Karaikudi Mani Iyer',
      ],
    ]

    for (const [description, honorific, name] of cases) {
      const mention = mentionFor(description, name)
      assert.equal(mention?.honorific, honorific, description)
      assert.equal(mention?.name, name, description)
    }
  })

  it('consumes a chain of honorifics, not just the first', () => {
    const mention = mentionFor('a Violin recital by Dr Smt N Rajam.', 'N Rajam')
    assert.equal(mention?.honorific, 'Dr Smt')
    assert.equal(mention?.name, 'N Rajam')
  })

  it('consumes a state honour stacked on a title', () => {
    const mention = mentionFor(
      'the legendary mridangam maestro Padma Vibhushan Vidwan Umayalpuram K Sivaraman, hosted by others.',
      'Umayalpuram K Sivaraman'
    )
    assert.equal(mention?.honorific, 'Padma Vibhushan Vidwan')
  })

  it('stops the name at a comma, a full stop or an ampersand', () => {
    assert.deepEqual(
      namesOf(
        'vocal recitals by Pt. Dinkar Kaikini, Smt Aditi Kaikini Upadhya.'
      ),
      ['Dinkar Kaikini', 'Aditi Kaikini Upadhya']
    )
    assert.deepEqual(namesOf('a vocal duet by Pt. Rajan & Pt. Sajan Mishra.'), [
      'Rajan',
      'Sajan Mishra',
    ])
  })

  it('does not swallow the lowercase word joining two names', () => {
    assert.deepEqual(
      namesOf('vocal recital by Pt. Venkatesh Kumar and Pt. Ulhas Kashalkar.'),
      ['Venkatesh Kumar', 'Ulhas Kashalkar']
    )
  })

  it('finds every performer in a dense multi-artist description', () => {
    const names = namesOf(
      'A 2-day festival featuring vocal recitals by Pt. Dinkar Kaikini, Smt Aditi ' +
        'Kaikini Upadhya, Pt. Ulhas Kashalkar, and Pt. Ajay Chakraborty, concluding ' +
        'with a Santoor solo by Pt. Shivkumar Sharma.'
    )
    assert.deepEqual(names, [
      'Dinkar Kaikini',
      'Aditi Kaikini Upadhya',
      'Ulhas Kashalkar',
      'Ajay Chakraborty',
      'Shivkumar Sharma',
    ])
  })

  it('picks up a name with no honorific at low confidence', () => {
    const mention = mentionFor(
      'a violin duet by Ganesh-Kumaresh.',
      'Ganesh-Kumaresh'
    )
    assert.equal(mention?.confidence, 'low')
    assert.equal(mention?.honorific, '')
  })

  it('does not report the same person twice from both passes', () => {
    assert.deepEqual(namesOf('a Sitar recital by Pt. Kushal Das.'), [
      'Kushal Das',
    ])
  })

  it('ignores places, forms and the trust itself', () => {
    const names = namesOf(
      'A residential shibir at Anubhav, Wayanad hosted by Svarit and the Punjab Gharana.'
    )
    assert.equal(names.includes('Svarit'), false)
    assert.equal(names.includes('Anubhav'), false)
    assert.equal(names.includes('Punjab Gharana'), false)
  })

  it('reads the discipline from the words closest to the mention', () => {
    const description =
      'a Tabla solo by Ustad Zakir Hussain, a Sitar recital by Ustad Shahid Parvez.'
    assert.equal(mentionFor(description, 'Zakir Hussain')?.discipline, 'Tabla')
    assert.equal(mentionFor(description, 'Shahid Parvez')?.discipline, 'Sitar')
  })

  it('leaves the discipline blank when the prose does not name one', () => {
    const mention = mentionFor(
      'alongside recitals by Smt Shubha Mudgal.',
      'Shubha Mudgal'
    )
    assert.equal(mention?.discipline, '')
  })
})

describe('draft building', () => {
  it('merges repeat mentions of one person and lists their events', () => {
    const mentions = collectMentions([
      event('Swaramrit', 'vocal by Pt. Ulhas Kashalkar.'),
      event('Dinarang', 'a recital by Pt. Ulhas Kashalkar.'),
    ])
    const [artist] = buildDraft(mentions)

    assert.equal(artist.name, 'Ulhas Kashalkar')
    assert.equal(artist.mentions, 2)
    assert.deepEqual(artist.events, ['Swaramrit', 'Dinarang'])
  })

  it('merges the same person written with different honorifics', () => {
    const mentions = collectMentions([
      event('A', 'a Sitar recital by Pt. Kushal Das.'),
      event('B', 'a Sitar recital by Shri Kushal Das.'),
    ])
    const draft = buildDraft(mentions)

    assert.equal(draft.length, 1)
    assert.equal(draft[0].mentions, 2)
    assert.deepEqual(draft[0].honorificVariants.sort(), ['Pt.', 'Shri'])
  })

  it('gives every artist a slugified uid', () => {
    const draft = buildDraft(
      collectMentions([event('A', 'vocal by Pt. Dinkar Kaikini.')])
    )
    assert.equal(draft[0].uid, 'dinkar-kaikini')
  })

  it('never emits two artists with the same uid', () => {
    const draft = buildDraft(
      collectMentions([
        event('A', 'vocal by Pt. Ajay Chakraborty and Smt Ajay Chakraborty.'),
        event('B', 'a recital by Pt. Kushal Das.'),
      ])
    )
    const uids = draft.map((artist) => artist.uid)
    assert.equal(new Set(uids).size, uids.length)
  })

  it('flags a probable misspelling of another name', () => {
    const draft = buildDraft(
      collectMentions([
        event('A', 'vocal by Pt. Ajay Chakraborty.'),
        event('B', 'vocal by Pt. Ajay Chakrabarty.'),
      ])
    )
    assert.equal(draft.length, 2)
    assert.ok(
      draft.every((artist) =>
        artist.review.some((n) => n.includes('duplicate'))
      )
    )
  })

  it('flags a shorter form of the same name', () => {
    const draft = buildDraft(
      collectMentions([
        event('A', 'vocal by Smt Aditi Kaikini Upadhya.'),
        event('B', 'vocal by Vidushi Aditi Upadhya.'),
      ])
    )
    assert.ok(
      draft.every((artist) =>
        artist.review.some((n) => n.includes('duplicate'))
      )
    )
  })

  it('does not flag two people who merely share a surname', () => {
    const draft = buildDraft(
      collectMentions([
        event('A', 'a Santoor recital by Pt. Shivkumar Sharma.'),
        event('B', 'a Santoor recital by Shri Rahul Sharma.'),
      ])
    )
    assert.ok(
      draft.every((artist) =>
        artist.review.every((n) => !n.includes('duplicate'))
      )
    )
  })

  it('flags a name captured without a surname', () => {
    const draft = buildDraft(
      collectMentions([
        event('A', 'a vocal duet by Pt. Rajan & Pt. Sajan Mishra.'),
      ])
    )
    const rajan = draft.find((artist) => artist.name === 'Rajan')
    assert.ok(rajan?.review.some((note) => note.includes('one name token')))
  })

  it('sorts the most-mentioned artists first', () => {
    const draft = buildDraft(
      collectMentions([
        event('A', 'vocal by Pt. Ulhas Kashalkar and Pt. Kushal Das.'),
        event('B', 'vocal by Pt. Ulhas Kashalkar.'),
      ])
    )
    assert.equal(draft[0].name, 'Ulhas Kashalkar')
  })
})

describe('name normalisation', () => {
  it('ignores case, punctuation and diacritics', () => {
    assert.equal(
      normaliseName('Aditi Kaikini Upadhya'),
      'aditi kaikini upadhya'
    )
    assert.equal(normaliseName('N. Rajam'), 'n rajam')
    assert.equal(normaliseName('Samvāda'), 'samvada')
  })
})

describe('levenshtein', () => {
  it('is zero for identical strings', () => {
    assert.equal(levenshtein('kaikini', 'kaikini'), 0)
  })

  it('counts single character substitutions', () => {
    assert.equal(levenshtein('chakraborty', 'chakrabarty'), 1)
  })

  it('counts insertions', () => {
    assert.equal(levenshtein('rajam', 'rajaram'), 2)
  })
})
