import { Link } from 'react-router-dom'
import { Zap, BarChart3, Share2, Users, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: <Zap size={22} className="text-violet-400" />,
    title: 'Create in Seconds',
    desc: 'Build a poll with up to 6 options, set an optional expiry, and share your link instantly.',
  },
  {
    icon: <Users size={22} className="text-violet-400" />,
    title: 'Audience Votes',
    desc: 'Anyone with the link can vote — no account required. Mobile-optimised for on-the-go audiences.',
  },
  {
    icon: <BarChart3 size={22} className="text-violet-400" />,
    title: 'Live Results',
    desc: 'Votes appear in real time via WebSocket. No refresh. No polling. True instant updates.',
  },
  {
    icon: <Share2 size={22} className="text-violet-400" />,
    title: 'Easy Sharing',
    desc: 'Copy your poll link or scan the QR code — perfect for live events and presentations.',
  },
]

const useCases = [
  'Live conference Q&A',
  'Team retrospectives',
  'Product feedback sessions',
  'Classroom quizzes',
  'Event planning votes',
  'Quick team decisions',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ===== Hero Section ===== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80"
            alt="Conference audience"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-overlay" />
        </div>

        {/* Animated background orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 animate-slide-up">
              Create Live Polls.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                Share Instantly.
              </span>{' '}
              See Results in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Real Time.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-xl leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Quorum brings your audience into the conversation. Create a poll, share the link, 
              and watch votes flow in live — no page refresh needed.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/register" className="btn-primary text-base px-8 py-4">
                Start for Free <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-secondary text-base px-8 py-4">
                Sign In
              </Link>
            </div>

            {/* Social proof */}
            <p className="mt-8 text-slate-500 text-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
              No credit card required • Real-time • Open to any audience
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-slate-500 rounded-full" />
          </div>
        </div>
      </section>

      {/* ===== Features Section ===== */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4">Everything you need to engage your audience</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Create interactive polls in seconds, captivate your audience anywhere, and watch every voice shape the conversation in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass-card p-6 hover:border-violet-500/30 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-4 group-hover:bg-violet-500/25 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="section-title mb-6">
                From idea to live poll in{' '}
                <span className="text-violet-400">30 seconds</span>
              </h2>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Create your poll', desc: 'Write your question, add up to 6 options, and optionally set an expiry time.' },
                  { step: '02', title: 'Share the link', desc: 'Copy the URL or scan the QR code. Anyone with the link can vote — no account needed.' },
                  { step: '03', title: 'Watch results live', desc: 'Results update instantly via WebSocket as votes come in. No refresh, no waiting.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div className="relative">
              <div className="absolute -inset-4 bg-violet-600/10 rounded-3xl blur-xl" />
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80"
                alt="Team collaboration session"
                className="relative rounded-2xl object-cover w-full h-80 lg:h-96 shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Use Cases ===== */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Perfect for every occasion</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {useCases.map((uc) => (
              <div key={uc} className="flex items-center gap-3 glass-card px-5 py-4">
                <CheckCircle size={16} className="text-violet-400 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{uc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Banner ===== */}
      <section className="py-20 bg-gradient-to-r from-violet-900/50 to-purple-900/50 border-y border-violet-800/30">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="section-title mb-4">Ready to engage your audience?</h2>
          <p className="text-slate-300 text-lg mb-8">Create your first poll for free. No credit card required.</p>
          <Link to="/register" className="btn-primary text-base px-10 py-4 inline-flex">
            Get Started — It's Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="py-10 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Quorum. Polls. Live. Together.</p>
          <p className="mt-1">Built with React, Go, MongoDB & Redis</p>
        </div>
      </footer>
    </div>
  )
}
