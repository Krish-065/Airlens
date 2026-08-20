import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineX, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register, loginWithGoogle } = useAuth();
  const { addToast } = useToast();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        addToast('success', 'Welcome back! 🎉');
      } else {
        await register(email, password, name || undefined);
        addToast('success', 'Account created! Welcome to AirLens 🌿');
      }
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(7, 26, 18, 0.45)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'login' ? 'Login' : 'Sign Up'}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: 'var(--bg-glass-heavy)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Background design elements */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-accent/10 blur-3xl" />

            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl cursor-pointer hover:opacity-75 transition-opacity"
              style={{ background: 'var(--mint)', color: 'var(--primary)', border: 'none' }}
              aria-label="Close"
            >
              <HiOutlineX size={18} />
            </button>

            <h2 className="text-3xl font-bold font-heading mb-2" style={{ color: 'var(--text)' }}>
              {mode === 'login' ? 'Welcome Back' : 'Join AirLens'}
            </h2>
            <p className="text-sm font-satoshi mb-6" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login'
                ? 'Sign in to upload reports and earn coins'
                : 'Create an account to start reporting pollution'}
            </p>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 rounded-2xl text-xs font-semibold font-satoshi" 
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            <div className="flex flex-col gap-4 relative z-10 mb-4">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    setLoading(true);
                    setError('');
                    try {
                      await loginWithGoogle(credentialResponse.credential);
                      addToast('success', mode === 'login' ? 'Welcome back! 🎉' : 'Account created! Welcome to AirLens 🌿');
                      resetForm();
                      onClose();
                    } catch (err: any) {
                      setError(err.message || 'Google login failed');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                onError={() => {
                  setError('Google login failed');
                }}
                theme="outline"
                size="large"
                shape="rectangular"
                width="100%"
                text={mode === 'login' ? 'signin_with' : 'signup_with'}
              />
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border)' }}></div>
                <span className="flex-shrink-0 mx-4 text-xs font-satoshi uppercase" style={{ color: 'var(--text-muted)' }}>Or continue with email</span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border)' }}></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
              {mode === 'signup' && (
                <div className="relative">
                  <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--primary)' }} size={18} />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field pl-11 py-3 text-sm font-satoshi"
                    maxLength={100}
                    aria-label="Name"
                  />
                </div>
              )}

              <div className="relative">
                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--primary)' }} size={18} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11 py-3 text-sm font-satoshi"
                  required
                  aria-label="Email"
                />
              </div>

              <div className="relative">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--primary)' }} size={18} />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 py-3 text-sm font-satoshi"
                  required
                  minLength={8}
                  aria-label="Password"
                />
              </div>

              {mode === 'signup' && (
                <div className="relative">
                  <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--primary)' }} size={18} />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-11 py-3 text-sm font-satoshi"
                    required
                    aria-label="Confirm password"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-gradient w-full py-4 rounded-xl text-sm font-bold font-satoshi disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block"
                    />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-satoshi" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); resetForm(); }}
                className="font-bold cursor-pointer hover:underline"
                style={{ color: 'var(--primary)', background: 'none', border: 'none' }}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
