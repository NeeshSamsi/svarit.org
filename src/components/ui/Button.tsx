'use client'

import { type VariantProps } from 'class-variance-authority'
import { button } from './button-variants'

export { button }

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export default function Button({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonProps) {
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    <button
      className={button({ variant, size, className })}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <span className='relative z-10 inline-flex items-center gap-2'>
        {children}
      </span>
    </button>
  )
}
