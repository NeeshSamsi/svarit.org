'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'
import ButtonLink from '@/components/ui/ButtonLink'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log it so a visitor who reports the problem has something to share, and so
    // it reaches any client error tracking that is listening.
    console.error(error)
  }, [error])

  return (
    <div className="col-span-full grid grid-cols-subgrid gap-y-18 pt-36 md:pt-44">
      <div className="col-span-full flex flex-col gap-6 lg:col-span-8">
        <h1 className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
          Something went wrong
        </h1>
        <p className="font-body text-xl font-light text-foreground">
          This one is on us, not you. Try loading the page again. If it keeps
          happening, please come back in a little while.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <ButtonLink variant="secondary" href="/">
            Back to home
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
