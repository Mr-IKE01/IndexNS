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
      <body className="bg-[#0d0a17] text-zinc-100 antialiased">{children}</body>
    </html>
  )
}
