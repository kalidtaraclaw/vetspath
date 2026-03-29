import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VetsPath — Your VA Benefits Navigator',
  description: 'Analyze your DD-214 and medical records to discover VA benefits you may qualify for. Get personalized form recommendations and pre-filled applications.',
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
