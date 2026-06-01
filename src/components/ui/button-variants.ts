import { cva, type VariantProps } from 'class-variance-authority'

export const button = cva(
  'font-body font-medium rounded-full transition-colors relative overflow-hidden inline-flex items-center justify-center cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-foreground text-primary border border-foreground hover:text-foreground btn-fill btn-fill-primary',
        secondary:
          'text-foreground border border-foreground hover:text-primary btn-fill btn-fill-secondary',
        tertiary:
          'bg-muted text-foreground border border-transparent hover:border-foreground',
      },
      size: {
        base: 'px-6 py-3',
        sm: 'px-4 py-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'base',
    },
  }
)

export type { VariantProps }
