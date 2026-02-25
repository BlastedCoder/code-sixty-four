import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Contact Us</h1>
        <p className="text-lg text-slate-500">
          Have a question about the draft, found a bug, or just want to talk hoops? Reach out below.
        </p>

        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 mt-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Email Support</h2>
            <p className="text-slate-500 pb-4">
              We typically reply within 24 hours.
            </p>
            <a 
              href="mailto:support@yourdomain.com" 
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-md"
            >
              support@yourdomain.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}