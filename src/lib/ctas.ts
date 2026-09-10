import { isFilled, type LinkField } from '@prismicio/client'
import type { EventDocument } from '../../prismicio-types'

export interface InitiativeCta {
  label: string
  field: LinkField | null
  href: string | null
  variant: 'primary' | 'secondary'
}

/**
 * The CTA row for an event's minimal card. Falls back to a single "Learn
 * more" link to the event page when the `ctas` group is empty, which is
 * every event today: the field shipped empty on all 24 existing documents.
 */
export function initiativeCtas(event: EventDocument): InitiativeCta[] {
  // The model isn't pushed to Prismic yet in this phase, so a document
  // fetched from the live API has no `ctas` key at all rather than `[]`.
  const ctas = (event.data.ctas ?? [])
    .filter((row) => isFilled.link(row.link))
    .map((row) => {
      // A migrated Text field reads as [] and still passes isFilled.keyText,
      // so guard with a plain string check rather than isFilled.
      const label =
        typeof row.label === 'string' && row.label.trim()
          ? row.label.trim()
          : 'Learn more'

      return {
        label,
        field: row.link,
        href: null,
        variant:
          row.style === 'Primary'
            ? ('primary' as const)
            : ('secondary' as const),
      }
    })

  if (ctas.length === 0) {
    return [
      {
        label: 'Learn more',
        field: null,
        href: event.url,
        variant: 'secondary',
      },
    ]
  }

  return ctas
}
