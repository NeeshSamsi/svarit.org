/**
 * Shared load-in timing. Above-the-fold heroes run a `gsap.timeline` on mount;
 * the card grids below them read these numbers so they hand off from the hero
 * instead of animating over it.
 */

/** The offset every hero timeline opens with: `gsap.timeline({ delay: 0.4 })`. */
export const HERO_INTRO_DELAY = 0.4

/**
 * When HeroPageHeader's timeline finishes, measured from mount.
 * delay + title (0.5) + description (0.4 tween, started at '-=0.2') = ~1.1
 */
export const PAGE_HEADER_INTRO_END = HERO_INTRO_DELAY + 0.5 + 0.2

/**
 * When ArtistHero's timeline finishes, measured from mount.
 * delay + photo (0.6) + the eyebrow->name->bio->socials stagger started at
 * '-=0.2', whose tail is 3 steps * 0.12 + a 0.4 tween = 0.76. = ~1.56
 */
export const ARTIST_HERO_INTRO_END =
  HERO_INTRO_DELAY + 0.6 - 0.2 + (3 * 0.12 + 0.4)

/**
 * When EventHero's timeline finishes, measured from mount. Same shape as the
 * artist hero: delay + hero image (0.6) + the meta->title->venue->description
 * stagger started at '-=0.2', tail 3 steps * 0.12 + a 0.4 tween = 0.76. = ~1.56
 * Events with no image finish sooner; the constant tracks the full header so the
 * slice handoff never starts early.
 */
export const EVENT_HERO_INTRO_END =
  HERO_INTRO_DELAY + 0.6 - 0.2 + (3 * 0.12 + 0.4)

/**
 * Seconds of the hero intro still unfinished. A grid that mounts on page load
 * gets the full remainder and waits the hero out; a grid scrolled into view
 * later has already missed the hero, so `performance.now() - mountedAt` exceeds
 * `introEnd` and this clamps to 0.
 */
export function introHandoff(mountedAt: number, introEnd: number): number {
  return Math.max(0, introEnd - (performance.now() - mountedAt) / 1000)
}
