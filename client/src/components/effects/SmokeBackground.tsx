import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export default function SmokeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    // Hide entirely on home page
    if (location.pathname === '/') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const createParticle = (): Particle => {
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.5 + 0.2), // Move upwards
        size: Math.random() * 5 + 10, // Slightly larger particles
        opacity: Math.random() * 0.2 + 0.15, // Increased opacity
        life: 0,
        maxLife: Math.random() * 500 + 300
      };
    };

    // Initial particles
    for (let i = 0; i < 350; i++) {
      const p = createParticle();
      p.y = Math.random() * canvas.height; // Distribute initially
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = theme === 'dark';
      const rgb = isDark ? '255, 255, 255' : '64, 64, 64'; // White smoke for dark mode, green smoke for light

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          p.vx -= (dx / dist) * force * 0.5;
          p.vy -= (dy / dist) * force * 0.5;
        }

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Add slight wandering (Brownian motion)
        p.vx += (Math.random() - 0.5) * 0.05;
        // Friction/damping
        p.vx *= 0.98;

        p.life++;

        if (p.life >= p.maxLife || p.y < -p.size || p.x < -p.size || p.x > canvas.width + p.size) {
          particles[i] = createParticle();
          continue;
        }

        // Fade in and out
        const lifeRatio = p.life / p.maxLife;
        let currentOpacity = p.opacity;
        if (lifeRatio < 0.2) {
          currentOpacity = p.opacity * (lifeRatio / 0.2);
        } else if (lifeRatio > 0.8) {
          currentOpacity = p.opacity * ((1 - lifeRatio) / 0.2);
        }

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(${rgb}, ${currentOpacity})`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);

        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [location.pathname, theme]);

  if (location.pathname === '/') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
