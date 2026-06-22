import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import SmoothScroll from '@/components/providers/SmoothScroll'
import Umami from '@/components/analytics/Umami'

export const metadata: Metadata = {
  title: 'Svarit',
  description: 'Hindustani Classical Music nonprofit, founded 2001',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="scroll-pt-32 bg-primary font-body text-foreground antialiased"
    >
      <head>
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
      </body>
    </html>
  )
}
