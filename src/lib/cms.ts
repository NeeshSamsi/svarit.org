import contentData from '@/data/content.json'

type InitiativeItem = {
  date: { date: string; label: string }
  title: string
  description: string
  image?: string
}

type ContentData = {
  navigation: Array<{ label: string; href: string; isPrimary?: boolean }>
  socials: { instagram: string; youtube: string; facebook: string }
  hero: { title: string; subtitle: string; cta: string; stats: string }
  volunteers: { name: string; image: string }[]
  about: { heading: string; subheading: string; paragraphs: string[] }
  initiatives: {
    heading: string
    subheading: string
    events: InitiativeItem[]
    workshops: InitiativeItem[]
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

export type { ContentData, InitiativeItem }

export function getContent(): ContentData {
  return contentData as ContentData
}
