/**
 * Above-the-fold intro tweens render their target with an `opacity: 0` start
 * state in the SSR markup so the first paint is already the animation's start,
 * not a flash of the finished layout. When scripting is unavailable the tween
 * never runs, so reset those elements to visible.
 *
 * Rendered once (from `NavClient`, which is on every page); React dedupes the
 * `<style>` by `href`.
 */
export default function GsapIntroStyles() {
  return (
    <style href="gsap-intro-reset" precedence="default">
      {`@media (scripting: none){[data-gsap-intro]{opacity:1!important;transform:none!important}}`}
    </style>
  )
}
