import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import SmoothScroll from '@/components/providers/SmoothScroll'
import Umami from '@/components/analytics/Umami'

export const metadata: Metadata = {
  metadataBase: new URL('https://svarit.org'),
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
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Svarit',
    title: 'Svarit — Shaping the Future of Indian Music',
    description:
      'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
    url: 'https://svarit.org',
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
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
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
  name: 'Svarit',
  legalName: 'Svarit Trust',
  url: 'https://svarit.org',
  logo: 'https://svarit.org/assets/logo.svg',
  image: 'https://svarit.org/og/home.jpg',
  description:
    'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
  foundingDate: '2001',
  email: 'svarittrust1@gmail.com',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
          <main className="max-w-content mx-auto grid w-full grid-cols-12 gap-x-6 gap-y-18 px-6">
            {children}
            <Footer />
          </main>
        </SmoothScroll>
        <Umami />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </body>
    </html>
  )
}
