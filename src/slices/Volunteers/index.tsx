import type { Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import type { SliceComponentProps } from '@prismicio/react'
import SectionTitle from '@/components/ui/SectionTitle'
import { getAllVolunteers } from '@/lib/queries'

export type VolunteersProps = SliceComponentProps<Content.VolunteersSlice>

export default async function Volunteers({ slice }: VolunteersProps) {
  const volunteers = await getAllVolunteers()

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Volunteers"
      className="col-span-full grid grid-cols-subgrid gap-y-8"
    >
      <div className="col-span-full">
        <SectionTitle
          eyebrow={slice.primary.subheading ?? undefined}
          title={slice.primary.heading ?? ''}
        />
      </div>
      {volunteers.map((volunteer) => (
        <div
          key={volunteer.id}
          className="col-span-6 flex flex-col gap-3 sm:col-span-4 lg:col-span-2"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-muted">
            <PrismicNextImage
              field={volunteer.data.photo}
              fallbackAlt=""
              fill
              sizes="(min-width: 1024px) 17vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover object-center"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display text-xl leading-tight font-medium text-foreground">
              {volunteer.data.name}
            </span>
            {volunteer.data.role && (
              <span className="font-body text-base font-light text-foreground">
                {volunteer.data.role}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
