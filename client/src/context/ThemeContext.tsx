import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Raindrop component for light mode transition
const Raindrops = () => {
  const drops = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[100]">
      {drops.map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, opacity: 0, scaleY: 0 }}
          animate={{ y: window.innerHeight + 100, opacity: [0, 1, 0.5, 0], scaleY: [0, 1, 1, 0] }}
          transition={{
            duration: 0.6 + Math.random() * 0.4,
            ease: "linear",
            delay: Math.random() * 0.5,
          }}
          className="absolute w-[2px] h-20 bg-blue-300/60 blur-[1px]"
          style={{ left: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  );
};

// Clouds component for dark mode transition
const Clouds = () => {
  const clouds = Array.from({ length: 6 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[100]">
      {clouds.map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: i % 2 === 0 ? '-100%' : '100%', y: `${i * 15}%`, opacity: 0, scale: 1 }}
          animate={{ x: '0%', opacity: 1, scale: 1.5 }}
          exit={{ opacity: 0, scale: 2, transition: { duration: 0.5 } }}
          transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
          className="absolute w-[60vw] h-[40vh] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(15,23,42,1) 0%, rgba(15,23,42,0.8) 50%, rgba(15,23,42,0) 100%)',
            left: i % 2 === 0 ? '-10vw' : 'auto',
            right: i % 2 !== 0 ? '-10vw' : 'auto',
          }}
        />
      ))}
    </div>
  );
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('airlens-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const [transitioningTo, setTransitioningTo] = useState<Theme | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('airlens-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    if (transitioningTo) return; // Prevent spamming
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTransitioningTo(nextTheme);

    // Halfway through animation, actually swap the CSS variables so it reveals perfectly
    setTimeout(() => {
      setTheme(nextTheme);
    }, 1200);

    // End transition
    setTimeout(() => {
      setTransitioningTo(null);
    }, 2500);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
      
      {/* Global Transition Overlays */}
      <AnimatePresence>
        {transitioningTo === 'light' && (
          <motion.div 
            className="fixed inset-0 z-[9999] pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
          >
            {/* Dark background fading out */}
            <div className="absolute inset-0 bg-[#071A12]" />
            <Raindrops />
            
            {/* Wiper effect (glass cleaning) */}
            <motion.div
              initial={{ x: '-100%', skewX: -20 }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.8 }}
              className="absolute inset-y-0 w-[150vw] bg-gradient-to-r from-transparent via-white/40 to-transparent blur-md z-[101]"
              style={{ transformOrigin: 'top left' }}
            />
            {/* Flashing brightness wipe */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, delay: 1.2 }}
              className="absolute inset-0 bg-white z-[102]"
            />
          </motion.div>
        )}

        {transitioningTo === 'dark' && (
          <motion.div 
            className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
          >
            {/* Start transparent, fade to dark */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="absolute inset-0 bg-[#071A12]" 
            />
            <Clouds />
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
