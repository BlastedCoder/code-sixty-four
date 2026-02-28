export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 space-y-6 text-slate-600">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Privacy Policy</h1>
        
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Information We Collect</h2>
        <p>
          [Placeholder] We collect information you provide directly to us when you create an account, update your profile, or use the Code Sixty Four platform. This includes your email address and display name.
        </p>

        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. How We Use Your Information</h2>
        <p>
          [Placeholder] We use the information we collect to operate, maintain, and provide the features and functionality of the tournament draft platform, including sending you draft results via email.
        </p>

        <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Data Security</h2>
        <p>
          [Placeholder] Your data is secured using industry-standard authentication (Supabase). We do not share or sell your personal data to third parties.
        </p>
      </div>
    </main>
  );
}