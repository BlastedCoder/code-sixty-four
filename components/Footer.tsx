import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <p className="text-slate-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} Code Sixty Four. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 text-sm font-bold text-slate-600">
          <Link href="/rules" className="hover:text-emerald-600 transition-colors">
            How to Play
          </Link>
          <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/contact" className="hover:text-emerald-600 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}