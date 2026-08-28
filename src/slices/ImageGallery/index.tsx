import type { Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import type { SliceComponentProps } from '@prismicio/react'
import SectionTitle from '@/components/ui/SectionTitle'

export type ImageGalleryProps = SliceComponentProps<Content.ImageGallerySlice>

export default function ImageGallery({ slice }: ImageGalleryProps) {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      {slice.primary.heading && (
        <div className="col-span-full">
          <SectionTitle title={slice.primary.heading} />
        </div>
      )}
      {slice.primary.images.map((item, i) => (
        <figure
          key={i}
          className="col-span-full flex flex-col gap-3 sm:col-span-6 lg:col-span-4"
        >
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-muted">
            <PrismicNextImage
              field={item.image}
              fallbackAlt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {item.caption && (
            <figcaption className="font-body text-base font-light text-foreground">
              {item.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </section>
  )
}
