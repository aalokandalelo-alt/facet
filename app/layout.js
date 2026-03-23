import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const figtree = Figtree({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata = {
  title: 'Cadence — Your team\'s content rhythm',
  description: 'A multi-workspace content calendar for teams and creators.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cadence',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#07070E',
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${figtree.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
      </head>
      <body className="h-full" style={{ fontFamily: 'var(--font-body, Figtree, Inter, sans-serif)' }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
