// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-card border-t border-slate-200 dark:border-card-border py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <p className="text-slate-500 dark:text-muted text-sm font-medium">
          &copy; {new Date().getFullYear()} Code Sixty Four. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-400">
          <Link href="/rules" className="hover:text-emerald-600 dark:hover:text-accent transition-colors">
            How to Play
          </Link>
          <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-accent transition-colors">
            Privacy Policy
          </Link>
          <Link href="/contact" className="hover:text-emerald-600 dark:hover:text-accent transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}