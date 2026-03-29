import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VetsPath by Aquia — Your VA Benefits Navigator',
  description: 'Analyze your DD-214 and medical records to discover VA benefits you may qualify for. Get personalized form recommendations and pre-filled applications.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="VetsPath: Your VA Benefits Navigator. Analyze your DD-214 and discover VA benefits you qualify for." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>
        {children}
      </body>
    </html>
  )
}
