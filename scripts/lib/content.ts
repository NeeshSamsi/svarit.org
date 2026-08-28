/** The shape of `src/data/content.json`, the migration source. */

import { readFile } from 'node:fs/promises'
import { CONTENT_PATH } from './paths.ts'

export type ContentEvent = {
  date: { date: string; label: string }
  title: string
  description: string
  image?: string
}

export type Content = {
  navigation: { label: string; href: string; isPrimary?: boolean }[]
  socials: { instagram: string; youtube: string; facebook: string }
  hero: { title: string; subtitle: string; cta: string; stats: string }
  volunteers: { name: string; image: string }[]
  about: { heading: string; subheading: string; paragraphs: string[] }
  initiatives: {
    heading: string
    subheading: string
    events: ContentEvent[]
    workshops: ContentEvent[]
  }
  donate: { heading: string; cta: string }
  sponsors: {
    heading: string
    subheading: string
    logos: { src: string; alt: string }[]
  }
  contact: {
    heading: string
    subheading: string
    description: string
    form: { nameLabel: string; emailLabel: string; messageLabel: string }
  }
  footer: {
    address: string
    contact: string
    copyright: string
    credits: string
  }
}

export async function loadContent(): Promise<Content> {
  return JSON.parse(await readFile(CONTENT_PATH, 'utf8'))
}

/** Events and workshops flattened into the single `event` type, tagged with its category. */
export function allEventEntries(
  content: Content
): { entry: ContentEvent; category: 'Event' | 'Workshop' }[] {
  return [
    ...content.initiatives.events.map((entry) => ({
      entry,
      category: 'Event' as const,
    })),
    ...content.initiatives.workshops.map((entry) => ({
      entry,
      category: 'Workshop' as const,
    })),
  ]
}
