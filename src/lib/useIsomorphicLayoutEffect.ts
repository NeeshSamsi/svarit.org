import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` on the client, `useEffect` on the server (where React warns
 * about the former and neither runs anyway).
 *
 * Above-the-fold GSAP intro tweens need layout-effect timing: `useEffect` fires
 * after the browser has painted, so `gsap.from(el, { opacity: 0 })` yanks an
 * already-visible element back to hidden, producing a flash of the finished
 * state before the animation. A layout effect applies the start state before
 * paint.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
