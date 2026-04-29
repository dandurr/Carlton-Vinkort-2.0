import './globals.css';

export const metadata = {
  title: 'Carlton - Vinkort',
  description: 'Udforsk vores udvalg af nøje udvalgte vine.',
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Vinkort',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png', // Husk at lægge et 512x512 logo her!
  },
};

export const viewport = {
  themeColor: '#f9fafb', // Lægger sig flot sammen med baggrundsfarven
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Forhindrer iPads i at zoome ind ved dobbeltklik
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body className="antialiased selection:bg-red-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
