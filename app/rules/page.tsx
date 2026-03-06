// app/rules/page.tsx
import Link from 'next/link';
import { Users, Repeat, Trophy, Medal } from 'lucide-react';

export default function RulesPage() {
  const steps = [
    {
      icon: <Users className="w-8 h-8 text-emerald-600" />,
      title: "1. Squad Up",
      description: "Join an 8-player league. You will be competing directly against the other 7 people in your specific war room."
    },
    {
      icon: <Repeat className="w-8 h-8 text-emerald-600" />,
      title: "2. The Snake Draft",
      description: "Once the league fills up, the commissioner starts the clock. The draft snakes back and forth (1 to 8, then 8 to 1). You will draft 8 of the 64 Tournament teams to build your ultimate roster."
    },
    {
      icon: <Trophy className="w-8 h-8 text-emerald-600" />,
      title: "3. Survive and Advance",
      description: "The scoring is incredibly simple: 1 Point per Win. Every time one of your drafted teams wins a real-life tournament game, you get a point."
    },
    {
      icon: <Medal className="w-8 h-8 text-emerald-600" />,
      title: "4. Cut Down the Nets",
      description: "Because every team can only lose once, the player with the most combined wins across their 8-team roster at the end of the National Championship takes the crown."
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">How to Play</h1>
          <p className="text-lg text-slate-500 dark:text-muted max-w-xl mx-auto">
            Forget busted brackets. Code Sixty Four is a live-drafting tournament pool where every single game matters.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="bg-white dark:bg-card p-8 rounded-2xl border border-slate-200 dark:border-card-border shadow-sm flex flex-col items-center text-center space-y-4 hover:border-emerald-500 hover:shadow-md transition-all">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-2">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-slate-500 dark:text-muted leading-relaxed text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="bg-slate-900 rounded-2xl p-8 text-center text-white space-y-6 shadow-lg">
          <h2 className="text-2xl font-bold">Ready to hit the war room?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold rounded-xl transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}