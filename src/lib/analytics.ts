/**
 * Typed wrapper around Umami's custom event tracking (see
 * `src/components/analytics/Umami.tsx`). `AnalyticsEvents` is the single
 * source of truth for every event name and its payload shape; add a new
 * event here first, then use `track` or `umamiEventAttrs` at the call site.
 *
 * Event names are capped at 50 chars and string values at 500 chars by
 * Umami itself, so none of the events below need to worry about that limit.
 */

export type AnalyticsEvents = {
  'newsletter-signup': {
    list: 'general' | 'centenary'
    result: 'new' | 'existing'
  }
  'newsletter-signup-failed': {
    reason: 'validation' | 'config' | 'server'
  }
  'donate-click': {
    location: 'nav' | 'nav-mobile' | 'footer' | 'donate-section'
  }
  'contact-submit': Record<string, never>
  'contact-submit-failed': {
    reason: string
  }
  'social-click': {
    platform: 'instagram' | 'youtube' | 'facebook'
    location: 'nav' | 'footer' | 'artist-card' | 'artist-hero'
    artist?: string
  }
  'contact-click': {
    method: 'email' | 'phone'
  }
  'hero-banner-click': {
    initiative: string
  }
  'not-found': {
    path: string
    referrer: string
  }
}

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, unknown>) => void
    }
  }
}

const RETRY_INTERVAL_MS = 200
const RETRY_TIMEOUT_MS = 5000

/**
 * Sends a custom Umami event. No-ops on the server. In development (where
 * `<Umami />` renders nothing, so `window.umami` never exists), logs the
 * call instead so events can be verified locally.
 *
 * The tracker script loads with `strategy="afterInteractive"`, so
 * `window.umami` may not exist yet on an early call; this retries briefly
 * before giving up silently rather than throwing.
 */
export function track<K extends keyof AnalyticsEvents>(
  name: K,
  data: AnalyticsEvents[K]
): void {
  if (typeof window === 'undefined') return

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[umami]', name, data)
    return
  }

  const send = () => window.umami?.track(name, data)

  if (window.umami) {
    send()
    return
  }

  const start = Date.now()
  const interval = setInterval(() => {
    if (window.umami) {
      clearInterval(interval)
      send()
    } else if (Date.now() - start >= RETRY_TIMEOUT_MS) {
      clearInterval(interval)
    }
  }, RETRY_INTERVAL_MS)
}

/**
 * Builds `data-umami-event*` attributes for declarative tracking. Usable
 * from server components: no `window` access, no `'use client'`. Only for
 * `target="_blank"`, `mailto:`, or `tel:` links, since the tracker
 * `preventDefault()`s a plain internal link, awaits the request, then sets
 * `location.href`, which kills client-side navigation. Use `track()` in an
 * `onClick` for internal same-tab links instead.
 */
export function umamiEventAttrs<K extends keyof AnalyticsEvents>(
  name: K,
  data: AnalyticsEvents[K]
): Record<string, string> {
  const attrs: Record<string, string> = { 'data-umami-event': name }

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    attrs[`data-umami-event-${key}`] = String(value)
  }

  return attrs
}
