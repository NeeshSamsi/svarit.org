interface SectionTitleProps {
  title: string
  eyebrow?: string
  description?: string
  className?: string
}

export default function SectionTitle({
  title,
  eyebrow,
  description,
  className = '',
}: SectionTitleProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {eyebrow && (
        <span className="font-body text-base font-light text-foreground">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl leading-tight font-medium text-foreground md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="font-body text-xl font-light text-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
