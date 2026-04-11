import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'wegbrait.com — wegbrait.com',
  description: 'wegbrait.com is wegbrait.com.',
  metadataBase: new URL('https://wegbrait.com'),
  openGraph: {
    title: 'wegbrait.com',
    description: 'wegbrait.com is wegbrait.com.',
    url: 'https://wegbrait.com',
    siteName: 'wegbrait.com',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'wegbrait.com',
    description: 'wegbrait.com is wegbrait.com.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
