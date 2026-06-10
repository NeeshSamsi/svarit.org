import Script from 'next/script'

const WEBSITE_ID = '295db284-4940-4d76-8222-b284f4cbb4ed'

export default function Umami() {
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <Script
        src="/u/script.js"
        data-website-id={WEBSITE_ID}
        strategy="afterInteractive"
      />
      <Script
        src="/u/recorder.js"
        data-website-id={WEBSITE_ID}
        data-sample-rate="0.15"
        data-mask-level="moderate"
        data-max-duration="300000"
        strategy="afterInteractive"
      />
    </>
  )
}
