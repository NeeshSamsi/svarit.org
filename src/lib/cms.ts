import contentData from '@/data/content.json'

type InitiativeItem = {
  date: string
  title: string
  description: string
}

type ContentData = {
  navigation: Array<{ label: string; href: string; isPrimary?: boolean }>
  hero: { title: string; subtitle: string; cta: string; stats: string }
  about: { heading: string; subheading: string; paragraphs: string[] }
  initiatives: {
    heading: string
    subheading: string
    events: InitiativeItem[]
    workshops: InitiativeItem[]
  }
  donate: { heading: string; cta: string }
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
