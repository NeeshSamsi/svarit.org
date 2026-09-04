'use client'

import { useEffect } from 'react'

// Catches a failure in the root layout itself, so React has no layout to render
// into: this component must supply its own `<html>` and `<body>`. It has no
// access to the app's fonts or styles and should almost never be seen, so it
// stays deliberately plain.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#fef7ed',
          color: '#1c1917',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 500 }}>
            Something went wrong
          </h1>
          <p style={{ fontWeight: 300 }}>
            Please reload the page. If the problem continues, try again in a
            little while.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid #1c1917',
              background: 'transparent',
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
