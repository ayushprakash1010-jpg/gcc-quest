import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Globe,
  Send,
  Network,
  Newspaper,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
            GQ
          </div>
          <span className="font-bold text-xl tracking-tight">GCC Quest AI</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium bg-white text-gray-950 rounded-full hover:bg-gray-100 transition-colors shadow-lg shadow-white/10"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>V1.0 is now live</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
          AI-Powered Market Intelligence for the GCC
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10">
          Automate your industry research. GCC Quest crawls thousands of news
          sources, detects macro trends using AI, and publishes insights
          directly to your company page.
        </p>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 z-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 w-full sm:w-auto group"
          >
            Launch App
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-24 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our autonomous pipeline handles everything from news discovery to
              final publication.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Globe className="w-6 h-6 text-blue-400" />}
              title="Global Intelligence"
              description="Continuous crawling of premium news sources, PR feeds, and industry blogs focused on the GCC region."
            />
            <FeatureCard
              icon={<Network className="w-6 h-6 text-indigo-400" />}
              title="Trend Detection"
              description="Advanced LLMs cluster related stories and evaluate their macro-economic impact to separate signal from noise."
            />
            <FeatureCard
              icon={<Send className="w-6 h-6 text-sky-400" />}
              title="Automated Publishing"
              description="Direct integration with the LinkedIn Community Management API to publish high-quality insights to your page."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} GCC Quest AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
