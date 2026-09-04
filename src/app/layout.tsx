import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import SmoothScroll from '@/components/providers/SmoothScroll'
import Umami from '@/components/analytics/Umami'
import { draftMode } from 'next/headers'
import { PrismicPreview } from '@prismicio/next'
import { repositoryName } from '@/prismicio'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Svarit — Honouring Legacy, Shaping the Future of Indian Music',
    template: '%s — Svarit',
  },
  description:
    'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
  applicationName: 'Svarit',
  authors: [{ name: 'Svarit' }],
  creator: 'Svarit',
  publisher: 'Svarit',
  category: 'Music',
  // No site-wide canonical: it is set per route. A default here silently
  // mislabels every page that does not override it, and the 404 in particular
  // inherited the homepage URL, the textbook soft-404 signal.
  openGraph: {
    type: 'website',
    siteName: 'Svarit',
    title: 'Svarit — Shaping the Future of Indian Music',
    description:
      'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
    url: SITE_URL,
    locale: 'en_IN',
    images: [
      {
        url: '/og/home.jpg',
        width: 1200,
        height: 630,
        alt: 'Svarit — shaping the future of Indian music, established 2001.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Svarit — Shaping the Future of Indian Music',
    description:
      'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
    images: ['/og/home.jpg'],
  },
  // Only the image-preview directive is set site-wide. index / follow are the
  // default anyway, and asserting them here leaks onto routes that opt out (the
  // 404) after hydration, where googlebot outranks the generic robots tag and
  // would contradict its noindex.
  robots: {
    googleBot: { 'max-image-preview': 'large' },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#fef7ed',
}

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'NGO',
  '@id': `${SITE_URL}/#organization`,
  name: 'Svarit',
  legalName: 'Svarit Trust',
  url: SITE_URL,
  logo: `${SITE_URL}/assets/logo.svg`,
  image: `${SITE_URL}/og/home.jpg`,
  description:
    'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
  foundingDate: '2001',
  email: 'team@svarit.org',
  telephone: '+91-99307-59942',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Anandashram, 22 Pandita Ramabai Rd, Gamdevi',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400007',
    addressCountry: 'IN',
  },
  founder: { '@type': 'Person', name: 'Pandit Dinkar Kaikini' },
  sameAs: [
    'https://instagram.com/svaritorg',
    'https://youtube.com/@svaritorg',
    'https://facebook.com/svaritorg',
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { isEnabled: isDraft } = await draftMode()

  return (
    <html
      lang="en-IN"
      className="scroll-pt-32 bg-primary font-body font-light text-foreground antialiased"
    >
      <head>
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://p.typekit.net"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="https://use.typekit.net/yan0qzb.css" />
      </head>
      <body>
        <Nav />
        <SmoothScroll>
          <main className="mx-auto grid w-full max-w-content grid-cols-12 gap-x-6 gap-y-18 px-6">
            {children}
            <Footer />
          </main>
        </SmoothScroll>
        <Umami />
        {/* Only in draft mode. Rendered unconditionally the toolbar injects an
            iframe that sets a third-party cookie for every visitor, which is the
            whole Best Practices hit and a privacy disclosure the site does not
            need. The dashboard flow still works: writing room to /api/preview
            enables draft mode, redirect, then this renders. The cost is that an
            editor on the live site no longer gets a preview session started for
            them, they start it from the dashboard. */}
        {isDraft && <PrismicPreview repositoryName={repositoryName} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </body>
    </html>
  )
}
