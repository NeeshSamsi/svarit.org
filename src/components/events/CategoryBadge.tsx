interface CategoryBadgeProps {
  category: 'Event' | 'Workshop'
  /**
   * `default` is the standalone badge used in card meta rows and on the event
   * page. `compact` matches the body text size (16px) with tighter padding, for
   * the badge that sits over a card image.
   */
  size?: 'default' | 'compact'
  className?: string
}

const sizes = {
  default: 'px-4 py-1 text-sm',
  compact: 'px-3 py-1 text-base',
}

export default function CategoryBadge({
  category,
  size = 'default',
  className = '',
}: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border border-foreground bg-muted font-body font-medium text-foreground ${sizes[size]} ${className}`}
    >
      {category}
    </span>
  )
}
