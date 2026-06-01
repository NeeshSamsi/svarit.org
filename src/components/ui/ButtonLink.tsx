'use client'

import { button } from './button-variants'
import type { VariantProps } from 'class-variance-authority'

type ButtonLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof button>

export default function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty(
      '--btn-x',
      `${((e.clientX - rect.left) / rect.width) * 100}%`
    )
    e.currentTarget.style.setProperty(
      '--btn-y',
      `${((e.clientY - rect.top) / rect.height) * 100}%`
    )
  }

  return (
    <a
      className={button({ variant, size, className })}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <span className='relative z-10 inline-flex items-center gap-2'>
        {children}
      </span>
    </a>
  )
}
