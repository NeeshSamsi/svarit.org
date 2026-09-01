/**
 * Reveal elements are hidden before first paint so GSAP never yanks a painted
 * element back to `opacity: 0` (the "snap"). Three hooks:
 * - `[data-gsap-intro]`: above-the-fold tweens, also hidden inline in the SSR
 *   markup so the first paint is the animation's start, not the finished layout.
 * - `.gsap-reveal`: a below-the-fold element a ScrollTrigger tween reveals.
 * - `[data-gsap-stagger] > *`: the direct children of a StaggerReveal wrapper.
 *
 * Anything carrying these must be animated back to visible by a tween somewhere,
 * or it stays hidden forever. When scripting is unavailable no tween runs, so
 * the `scripting: none` block resets them all.
 *
 * Rendered once (from `NavClient`, which is on every page); React dedupes the
 * `<style>` by `href`.
 */
export default function GsapIntroStyles() {
  return (
    <style href="gsap-intro-reset" precedence="default">
      {`.gsap-reveal{opacity:0}[data-gsap-stagger]>*{opacity:0}@media (scripting: none){[data-gsap-intro],.gsap-reveal,[data-gsap-stagger]>*{opacity:1!important;transform:none!important}}`}
    </style>
  )
}
