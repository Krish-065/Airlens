import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMap, HiOutlinePlusCircle, HiOutlineUser, HiOutlineMenu, HiOutlineX, HiOutlineGlobe, HiOutlineLightningBolt, HiOutlineHome } from 'react-icons/hi';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home', icon: HiOutlineHome },
    { to: '/feed', label: 'Explore', icon: HiOutlineGlobe },
    { to: '/map', label: 'India AQI', icon: HiOutlineMap },
    { to: '/upload', label: 'Upload', icon: HiOutlinePlusCircle },
  ];

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled 
            ? 'var(--bg-nav)' 
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          boxShadow: scrolled ? 'var(--shadow)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 no-underline group" aria-label="AirLens Home">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-heading font-bold text-lg transition-transform duration-300 group-hover:scale-105"
                style={{ background: 'var(--gradient-btn)' }}
              >
                🌱
              </div>
              <span className="font-heading text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                Air<span style={{ color: 'var(--primary)' }}>Lens</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold tracking-wide font-satoshi no-underline transition-all duration-300"
                  style={{
                    color: isActive(link.to) ? 'var(--primary)' : 'var(--text-secondary)',
                  }}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                >
                  {isActive(link.to) && (
                    <motion.div 
                      layoutId="nav-active-pill" 
                      className="absolute inset-0 rounded-xl z-[-1]" 
                      style={{ background: 'var(--mint)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <link.icon size={18} />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Actions Panel */}
            <div className="flex items-center gap-4">
              {/* Coins Indicator */}
              {isAuthenticated && (
                <div 
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-number border transition-all duration-300"
                  style={{ background: 'var(--mint)', color: 'var(--primary)', borderColor: 'var(--border)' }}
                >
                  <span>🪙</span>
                  <span>{user?.coins ?? 0}</span>
                </div>
              )}

              {/* Theme Toggle */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="p-3 rounded-xl transition-all duration-300 cursor-pointer border hover:opacity-90"
                style={{ background: scrolled ? 'var(--bg-glass)' : 'var(--bg-card)', color: 'var(--primary)', borderColor: 'var(--border)' }}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={theme}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
                  </motion.div>
                </AnimatePresence>
              </motion.button>

              {/* User Account Button */}
              {isAuthenticated ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer border"
                    style={{ background: 'var(--bg-card)', color: 'var(--text)', borderColor: 'var(--border)' }}
                  >
                    <HiOutlineUser size={18} style={{ color: 'var(--primary)' }} />
                    <span className="text-sm font-semibold font-satoshi max-w-[120px] truncate">
                      {user?.name || 'Account'}
                    </span>
                  </button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 mt-3 w-48 rounded-2xl overflow-hidden glass-heavy"
                        style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                      >
                        <Link 
                          to="/profile" 
                          className="block px-5 py-3 text-sm font-semibold font-satoshi no-underline transition-colors hover:bg-mint"
                          style={{ color: 'var(--text)' }}
                        >
                          My Profile
                        </Link>
                        <button
                          onClick={() => { logout(); navigate('/'); }}
                          className="w-full text-left px-5 py-3 text-sm font-semibold font-satoshi cursor-pointer transition-colors hover:bg-red-500/10 text-red-500"
                          style={{ background: 'transparent', border: 'none', borderTop: '1px solid var(--border)' }}
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
                  className="hidden md:inline-flex btn-gradient text-sm font-semibold font-satoshi no-underline cursor-pointer"
                >
                  Login
                </button>
              )}

              {/* Mobile Navigation Trigger */}
              <button
                className="md:hidden p-3 rounded-xl cursor-pointer border"
                style={{ background: 'var(--bg-card)', color: 'var(--primary)', borderColor: 'var(--border)' }}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <HiOutlineX size={20} /> : <HiOutlineMenu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden flex flex-col justify-between"
            style={{ background: 'var(--bg)', paddingTop: '96px', paddingBottom: '32px' }}
          >
            <div className="flex flex-col px-6 gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl text-lg font-semibold font-satoshi no-underline"
                  style={{
                    color: isActive(link.to) ? 'var(--primary)' : 'var(--text)',
                    background: isActive(link.to) ? 'var(--mint)' : 'transparent',
                    border: isActive(link.to) ? '1px solid var(--border)' : '1px solid transparent',
                  }}
                >
                  <link.icon size={22} />
                  {link.label}
                </Link>
              ))}

              {isAuthenticated ? (
                <>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl text-lg font-semibold font-satoshi no-underline"
                    style={{ color: 'var(--text)', border: '1px solid transparent' }}
                  >
                    <HiOutlineUser size={22} style={{ color: 'var(--primary)' }} /> 
                    Profile
                  </Link>
                  <div 
                    className="flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold font-number"
                    style={{ color: 'var(--primary)' }}
                  >
                    <span>🪙</span>
                    <span>{user?.coins ?? 0} Coins</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-6">
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); navigate('/'); setMobileOpen(false); }}
                  className="btn-outline w-full py-4 text-center cursor-pointer text-base font-bold"
                >
                  Logout
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { setAuthMode('login'); setAuthOpen(true); setMobileOpen(false); }}
                    className="btn-gradient w-full py-4 text-center cursor-pointer text-base font-bold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setAuthMode('signup'); setAuthOpen(true); setMobileOpen(false); }}
                    className="btn-outline w-full py-4 text-center cursor-pointer text-base font-bold"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </>
  );
}
