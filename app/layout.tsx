// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthHeader from "@/components/AuthHeader";
import Footer from '@/components/Footer';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Code Sixty Four",
  description: "Tournament Draft Pool",
};

// Inline script to prevent flash of wrong theme on page load
const themeScript = `
  (function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} bg-background text-foreground`}>
        <div className="flex flex-col min-h-screen">
          <AuthHeader />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}