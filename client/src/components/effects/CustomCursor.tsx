import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [clickParticles, setClickParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    // Only enable custom cursor on non-touch devices
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 12); // Offset to center the leaf
      cursorY.set(e.clientY - 12);
      
      const target = e.target as HTMLElement;
      // Check if hovering over an interactive element
      if (target.closest('button, a, input, select, textarea, [role="button"]')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Scatter 5 small leaves
      const newParticles = Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i,
        x: e.clientX,
        y: e.clientY
      }));
      setClickParticles(newParticles);
      
      // Cleanup after animation
      setTimeout(() => {
        setClickParticles([]);
      }, 600);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [cursorX, cursorY]);

  // If mobile/touch device, don't render the custom cursor overlay
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) {
    return null;
  }

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99999] text-2xl drop-shadow-md"
        style={{
          x: cursorX,
          y: cursorY,
        }}
        animate={{
          rotate: isHovering ? [0, -20, 20, -20, 0] : 0,
          scale: isHovering ? 1.2 : 1
        }}
        transition={{
          rotate: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
          scale: { duration: 0.2 }
        }}
      >
        🍃
      </motion.div>

      <AnimatePresence>
        {clickParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: p.x - 8, y: p.y - 8, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x - 8 + (Math.random() - 0.5) * 80,
              y: p.y - 8 + (Math.random() - 0.5) * 80,
              scale: Math.random() * 0.5 + 0.5,
              opacity: 0,
              rotate: (Math.random() - 0.5) * 360
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed top-0 left-0 pointer-events-none z-[99998] text-base drop-shadow-sm"
          >
            🍃
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
