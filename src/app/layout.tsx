import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { NextAuthProvider } from './providers/NextAuthProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SecretarIA',
  description: 'Sua secretária virtual inteligente',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <NextAuthProvider>
          <Providers>{children}</Providers>
        </NextAuthProvider>
      </body>
    </html>
  );
} 