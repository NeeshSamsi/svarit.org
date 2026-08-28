/**
 * Artist name extraction.
 *
 * content.json has no artist records. Names appear only inside event description prose,
 * e.g. "vocal recitals by Pt. Dinkar Kaikini, Smt Aditi Kaikini Upadhya". Everything here is
 * pure so `scripts/artists.test.ts` can pin the behaviour down.
 */

import type { ContentEvent } from './content.ts'
import { slugify } from './transform.ts'

export type Mention = {
  raw: string
  honorific: string
  name: string
  eventTitle: string
  confidence: 'high' | 'low'
  discipline: string
}

export type DraftArtist = {
  uid: string
  name: string
  honorific: string
  honorificVariants: string[]
  discipline: string
  bio: string
  events: string[]
  mentions: number
  confidence: 'high' | 'low'
  review: string[]
}

/**
 * Honorifics and titles, longest first so that "Padma Vibhushan" wins over a shorter match
 * and so chains like "Dr Smt" or "Padma Vibhushan Vidwan" are consumed completely.
 */
export const HONORIFICS = [
  'Padma Vibhushan',
  'Padma Bhushan',
  'Vidushi',
  'Pandit',
  'Acharya',
  'Vidwan',
  'Ustad',
  'Shri',
  'Smt.',
  'Sri',
  'Smt',
  'Pt.',
  'Dr.',
  'Pt',
  'Dr',
]

/** Instruments and forms used to guess a discipline from the words around a mention. */
const DISCIPLINES: [RegExp, string][] = [
  [/\b(?:vocal|choral|dhrupad)\b/gi, 'Hindustani Vocal'],
  [/\btabla\b/gi, 'Tabla'],
  [/\bsitar\b/gi, 'Sitar'],
  [/\bsantoor\b/gi, 'Santoor'],
  [/\bsarod\b/gi, 'Sarod'],
  [/\bflute\b/gi, 'Flute'],
  [/\bviolin\b/gi, 'Violin'],
  [/\bkathak\b/gi, 'Kathak'],
  [/\bmridangam\b/gi, 'Mridangam'],
  [/\bpercussion\b/gi, 'Percussion'],
]

/**
 * How far back to look for an instrument. Wide enough to cover "a Sitar recital by ...",
 * narrow enough not to reach the previous performer in the same sentence.
 */
const DISCIPLINE_WINDOW = 55

/**
 * Capitalised words in these descriptions that are places, forms, works or the trust
 * itself. Only applied to the low confidence pass, which has no honorific to anchor on.
 */
const NOT_A_PERSON = new Set(
  [
    'Svarit',
    'Dinarang',
    'Sumiran',
    'Samvada',
    'Anubhav',
    'Wayanad',
    'Mumbai',
    'Pune',
    'Chowpatty',
    'Bhartiya',
    'Vidya',
    'Bhavan',
    'Hindustani',
    'Punjab',
    'Gharana',
    'Kathak',
    'Tabla',
    'Sitar',
    'Santoor',
    'Sarod',
    'Violin',
    'Flute',
    'Dhrupad',
    'Mridangam',
    'Jugalbandi',
    'Understanding',
    'Riyaaz',
    'Shibir',
    'Evening',
    'Workshop',
    'Lecture',
  ].map((word) => word.toLowerCase())
)

const HONORIFIC_PATTERN = HONORIFICS.map((honorific) =>
  honorific.replace(/\./g, '\\.')
).join('|')

/** A run of capitalised words, allowing initials ("N", "S.") and hyphenated duos. */
const NAME_PATTERN = '[A-Z][\\p{L}]*\\.?(?:[ -][A-Z][\\p{L}]*\\.?)*'

const honorificMention = new RegExp(
  `\\b((?:(?:${HONORIFIC_PATTERN})\\s+)+)(${NAME_PATTERN})`,
  'gu'
)

const looseMention = new RegExp(`\\b(?:by|with|and)\\s+(${NAME_PATTERN})`, 'gu')

const honorificOnly = new RegExp(`^(?:(?:${HONORIFIC_PATTERN})\\s*)+$`, 'u')

/** Key used to merge mentions of the same person written slightly differently. */
export function normaliseName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function guessDiscipline(description: string, index: number): string {
  // Instruments are named just before the performer, e.g. "a Sitar recital by Pt. ...".
  // Several performers share a sentence, so take the keyword closest to this mention
  // rather than the first one in the list.
  const window = description.slice(
    Math.max(0, index - DISCIPLINE_WINDOW),
    index
  )

  let best = ''
  let bestIndex = -1
  for (const [pattern, discipline] of DISCIPLINES) {
    for (const match of window.matchAll(pattern)) {
      const at = match.index ?? 0
      if (at > bestIndex) {
        bestIndex = at
        best = discipline
      }
    }
  }

  return best
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 0; i < a.length; i++) {
    const current = [i + 1]
    for (let j = 0; j < b.length; j++) {
      current[j + 1] = Math.min(
        current[j] + 1,
        previous[j + 1] + 1,
        previous[j] + (a[i] === b[j] ? 0 : 1)
      )
    }
    previous = current
  }
  return previous[b.length]
}

export function collectMentions(events: ContentEvent[]): Mention[] {
  const mentions: Mention[] = []

  for (const event of events) {
    const description = event.description
    const claimed: [number, number][] = []

    for (const match of description.matchAll(honorificMention)) {
      const index = match.index ?? 0
      claimed.push([index, index + match[0].length])
      mentions.push({
        raw: match[0].trim(),
        honorific: match[1].trim(),
        name: match[2].trim().replace(/[.,]+$/, ''),
        eventTitle: event.title,
        confidence: 'high',
        discipline: guessDiscipline(description, index),
      })
    }

    for (const match of description.matchAll(looseMention)) {
      const nameIndex = (match.index ?? 0) + match[0].indexOf(match[1])
      const name = match[1].trim().replace(/[.,]+$/, '')

      // Skip anything the honorific pass already took, plus obvious non-people.
      const overlaps = claimed.some(
        ([start, end]) => nameIndex >= start && nameIndex < end
      )
      if (overlaps) continue
      if (honorificOnly.test(name)) continue
      if (
        name.split(/[ -]/).some((word) => NOT_A_PERSON.has(word.toLowerCase()))
      )
        continue

      mentions.push({
        raw: match[0].trim(),
        honorific: '',
        name,
        eventTitle: event.title,
        confidence: 'low',
        discipline: guessDiscipline(description, nameIndex),
      })
    }
  }

  return mentions
}

export function buildDraft(mentions: Mention[]): DraftArtist[] {
  const byName = new Map<string, DraftArtist>()
  const honorificCounts = new Map<string, Map<string, number>>()

  for (const mention of mentions) {
    const key = normaliseName(mention.name)
    if (!key) continue

    let artist = byName.get(key)
    if (!artist) {
      artist = {
        uid: slugify(mention.name),
        name: mention.name,
        honorific: '',
        honorificVariants: [],
        discipline: mention.discipline,
        bio: '',
        events: [],
        mentions: 0,
        confidence: mention.confidence,
        review: [],
      }
      byName.set(key, artist)
      honorificCounts.set(key, new Map())
    }

    artist.mentions += 1
    if (!artist.events.includes(mention.eventTitle))
      artist.events.push(mention.eventTitle)
    if (!artist.discipline) artist.discipline = mention.discipline
    if (mention.confidence === 'high') artist.confidence = 'high'

    if (mention.honorific) {
      const counts = honorificCounts.get(key)!
      counts.set(mention.honorific, (counts.get(mention.honorific) ?? 0) + 1)
    }
  }

  for (const [key, artist] of byName) {
    const counts = [...(honorificCounts.get(key) ?? new Map<string, number>())]
    counts.sort((a, b) => b[1] - a[1])
    artist.honorific = counts[0]?.[0] ?? ''
    artist.honorificVariants = counts.map(([honorific]) => honorific)

    if (artist.name.split(/[ -]/).length < 2) {
      artist.review.push(
        'Only one name token was captured. The surname is probably in the prose right after it.'
      )
    }
    if (artist.confidence === 'low') {
      artist.review.push(
        'No honorific preceded this name, so it may not be a person at all.'
      )
    }
    if (!artist.discipline) {
      artist.review.push('No instrument or form was named near the mention.')
    }
  }

  const artists = [...byName.values()]

  // Flag near duplicates, e.g. Chakraborty vs Chakrabarty, or Aditi Upadhya vs
  // Aditi Kaikini Upadhya. A shared surname alone is not enough, or every Sharma would
  // flag every other Sharma.
  for (let i = 0; i < artists.length; i++) {
    for (let j = i + 1; j < artists.length; j++) {
      const a = normaliseName(artists[i].name)
      const b = normaliseName(artists[j].name)
      const aTokens = new Set(a.split(' '))
      const bTokens = new Set(b.split(' '))

      const misspelling = levenshtein(a, b) <= 2
      const subset =
        [...aTokens].every((token) => bTokens.has(token)) ||
        [...bTokens].every((token) => aTokens.has(token))

      if (!misspelling && !subset) continue

      artists[i].review.push(`Possible duplicate of "${artists[j].name}".`)
      artists[j].review.push(`Possible duplicate of "${artists[i].name}".`)
    }
  }

  artists.sort(
    (a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name)
  )

  // uids must be unique even before the user edits names.
  const seen = new Map<string, number>()
  for (const artist of artists) {
    const base = artist.uid
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    if (count > 0) artist.uid = `${base}-${count + 1}`
  }

  return artists
}
