import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SuiNS Indexer',
  description: 'Private SuiNS domain indexer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
