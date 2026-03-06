// app/privacy/page.tsx
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-card p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-card-border space-y-6 text-slate-600 dark:text-slate-400">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>

        <p><strong className="text-slate-800 dark:text-slate-200">Last Updated:</strong> March 5, 2026</p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">1. Information We Collect</h2>
        <p>
          When you create an account on Code Sixty Four, we collect your email address and display name. If you upload a profile avatar, that image is stored securely. When you participate in leagues, we store your draft picks, chat messages, and league membership data to provide the service.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">2. How We Use Your Information</h2>
        <p>
          We use your information solely to operate and improve the Code Sixty Four platform. This includes authenticating your account, displaying your profile to other league members, delivering real-time draft and chat functionality, tracking tournament scores and standings, and sending you draft-related notifications.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">3. Data Security</h2>
        <p>
          Your data is protected using industry-standard security practices. Authentication is handled by Supabase with encrypted connections (HTTPS/TLS). Passwords are never stored in plain text. Row-level security policies ensure you can only access data for leagues you belong to.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">4. Cookies & Local Storage</h2>
        <p>
          We use browser local storage to maintain your authentication session and remember your theme preference (light/dark mode). We do not use third-party tracking cookies or analytics services.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">5. Third-Party Sharing</h2>
        <p>
          We do not sell, rent, or share your personal information with third parties. Your data is only shared with other members of your league as necessary to provide the draft, chat, and tournament features.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">6. Data Retention</h2>
        <p>
          Your account data and league history are retained as long as your account is active. If you wish to delete your account and associated data, please contact us and we will process your request promptly.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">7. Children&apos;s Privacy</h2>
        <p>
          Code Sixty Four is not directed at children under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child under 13 has provided us with personal data, we will take steps to delete it.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">8. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify users of any material changes by updating the &ldquo;Last Updated&rdquo; date at the top of this page.
        </p>

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">9. Contact Us</h2>
        <p>
          If you have any questions about this privacy policy or your personal data, please reach out through our Contact page.
        </p>
      </div>
    </main>
  );
}
