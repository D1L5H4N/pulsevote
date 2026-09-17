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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-900/60 to-purple-950/80 border border-violet-500/30 overflow-hidden shadow-lg shadow-violet-900/40 group-hover:border-violet-400 transition-all flex items-center justify-center p-1.5">
              <img
                src="/quorum-icon.png"
                alt="Quorum"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <span className="font-extrabold text-2xl text-white tracking-tight">
              Quorum
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <InstallPwaButton className="mr-1" />

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <Link
                  to="/my-polls"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <BarChart3 size={15} />
                  My Polls
                </Link>
                <Link
                  to="/polls/create"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white transition-all font-medium"
                >
                  <PlusCircle size={15} />
                  Create Poll
                </Link>
                <div className="h-6 w-px bg-slate-800 mx-1" />
                <span className="text-sm text-slate-400">Hi, {user.name.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn-primary !py-2 !px-5 !text-sm">
                  Get Started
                </Link>
              </>
            )}
          </nav>

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
