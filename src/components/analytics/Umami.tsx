import Script from 'next/script'

const WEBSITE_ID = '295db284-4940-4d76-8222-b284f4cbb4ed'

export default function Umami() {
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <Script
        src="/u/script.js"
        data-website-id={WEBSITE_ID}
        data-domains="www.svarit.org,svarit.org"
        data-performance="true"
        strategy="afterInteractive"
      />
      {/* Replay and heatmap settings (sample rate, mask level, max duration)
          live in the Umami dashboard under Websites > Edit > Replays &
          Heatmaps: the recorder only reads data-website-id/data-host-url off
          this tag and fetches the rest from /api/websites/<id>/recorder. */}
      <Script
        src="/u/recorder.js"
        data-website-id={WEBSITE_ID}
        strategy="afterInteractive"
      />
    </>
  )
}
