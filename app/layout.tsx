import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthHeader from "@/components/AuthHeader";
import Footer from '@/components/Footer';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Code Sixty Four",
  description: "NCAA Tournament Draft Pool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
        <AuthHeader /> {/* 2. Add the header here */}
        <main className="flex-grow">
        {children}
        </main>
        <Footer />
        </div>
      </body>
    </html>
  );
}