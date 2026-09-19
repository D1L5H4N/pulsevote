import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, LogOut, Menu, X, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import InstallPwaButton from './InstallPwaButton'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-4 group focus:outline-none">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:border-violet-400/60 transition-colors">
                <img
                  src="/quorum-icon.png"
                  alt="Quorum Logo"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <span className="font-bold text-xl text-white tracking-tight leading-none">
                Quorum
              </span>
            </Link>
          </div>

          {/* Navigation Section (Equal spacing, gap: 40px) */}
          <nav className="hidden md:flex items-center gap-10">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/my-polls"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <BarChart3 size={15} />
              <span>My Polls</span>
            </Link>
          </nav>

          {/* Actions & User Section (32px gap between CTA and User Section) */}
          <div className="hidden md:flex items-center gap-8">
            <InstallPwaButton className="!h-9 !py-0" />

            {user ? (
              <>
                {/* CTA Button */}
                <Link
                  to="/polls/create"
                  className="h-9 inline-flex items-center gap-2 px-4 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all"
                >
                  <PlusCircle size={15} />
                  <span>Create Poll</span>
                </Link>

                {/* User Section: Hi, {name} | Logout */}
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="text-slate-300 font-medium">
                    Hi, {user.name.split(' ')[0]}
                  </span>
                  <span className="text-slate-700">|</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="h-9 inline-flex items-center px-4 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle & Install button */}
          <div className="md:hidden flex items-center gap-2">
            <InstallPwaButton />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 py-4 space-y-2 animate-fade-in">
            <div className="px-2 pb-2 border-b border-slate-800/80">
              <InstallPwaButton className="w-full justify-center !py-2.5 !text-sm" />
            </div>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-all">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link to="/my-polls" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-all">
                  <BarChart3 size={16} /> My Polls
                </Link>
                <Link to="/polls/create" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-violet-400 hover:bg-violet-500/10 transition-all">
                  <PlusCircle size={16} /> Create Poll
                </Link>
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-all">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-violet-400 hover:bg-violet-500/10 transition-all">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
