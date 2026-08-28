interface CategoryBadgeProps {
  category: 'Event' | 'Workshop'
  className?: string
}

export default function CategoryBadge({
  category,
  className = '',
}: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border border-foreground bg-muted px-4 py-1 font-body text-sm font-medium text-foreground ${className}`}
    >
      {category}
    </span>
  )
}
