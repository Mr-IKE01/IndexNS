import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SuiNS Indexer',
  description: 'Private SuiNS domain indexer — tracks expiry, grace periods, and ownership',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
