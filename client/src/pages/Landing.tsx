import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { HiOutlineEye, HiOutlineUpload, HiOutlineHeart, HiOutlineGlobe, HiOutlineChevronDown, HiOutlineArrowRight } from 'react-icons/hi';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { reportsApi } from '@/lib/api';
import BgSequence from '@/components/animations/BgSequence';

import heroImg from '@/assets/hero-pollution.jpg';
import vehicularImg from '@/assets/vehicular-pollution.jpg';
import industrialImg from '@/assets/industrial-pollution.jpg';

// Animated wrapper for elements revealing on scroll
function FadeReveal({ children, delay = 0, yOffset = 30 }: { children: React.ReactNode; delay?: number; yOffset?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: 'blur(4px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Animate numbers up to a limit when they enter the viewport
function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    if (start === end) return;

    let totalMilliseconds = duration;
    let incrementTime = Math.max(Math.floor(totalMilliseconds / 40), 20);
    let step = Math.ceil(end / (totalMilliseconds / incrementTime));

    let timer = setInterval(() => {
      start += step;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString('en-IN')}</span>;
}

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalReports: 0,
    totalConfirms: 0,
    totalLikes: 0,
    totalCities: 0,
  });

  useEffect(() => {
    reportsApi.getStats()
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err));
  }, []);

  // Allow authenticated users to view the landing page instead of auto-redirecting

  const openAuth = (mode: 'login' | 'signup') => {
    if (isAuthenticated) {
      navigate('/feed');
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  };

  // Parallax Scroll for Hero
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroImageY = useTransform(scrollYProgress, [0, 1], ['0%', '35%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Cities for the interactive India Map preview
  const mapCities = [
    { name: 'Delhi', aqi: 312, reports: 124, x: '47%', y: '24%', color: '#F44336' },
    { name: 'Mumbai', aqi: 118, reports: 86, x: '35%', y: '58%', color: '#FF9800' },
    { name: 'Bangalore', aqi: 62, reports: 42, x: '46%', y: '78%', color: '#FFEB3B' },
    { name: 'Kolkata', aqi: 184, reports: 95, x: '72%', y: '42%', color: '#F44336' },
    { name: 'Ahmedabad', aqi: 142, reports: 37, x: '32%', y: '46%', color: '#FF9800' },
    { name: 'Kanpur', aqi: 245, reports: 61, x: '51%', y: '32%', color: '#9C27B0' },
  ];

  const [hoveredCity, setHoveredCity] = useState<typeof mapCities[0] | null>(null);

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      {/* ─── HERO SECTION: Cinematic Experience ─── */}
      <section ref={heroRef} className="relative h-screen w-full flex items-center justify-center overflow-hidden pt-20">
        {/* Parallax Background Image with Subtle Dark Overlay */}
        <motion.div
          style={{ y: heroImageY, opacity: heroOpacity }}
          className="absolute inset-0 w-full h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#071A12]/40 via-[#071A12]/60 to-[#071A12]/95 z-10" />
          <img
            src={heroImg}
            alt="City landscape covered in dark atmospheric smog and industrial particulate emissions"
            className="w-full h-full object-cover select-none"
            loading="eager"
          />
        </motion.div>

        {/* Content Centered Vertically */}
        <div className="relative z-20 max-w-5xl mx-auto px-6 text-center flex flex-col items-center gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold font-satoshi uppercase tracking-wider mx-auto border backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              🌱 Documenting Environmental Reality
            </span>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black font-heading leading-none tracking-tight text-white mt-2">
              See What Pollution <br />
              <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">Really Looks Like</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl font-satoshi font-medium text-gray-200 max-w-2xl mx-auto leading-relaxed mt-4">
              AQI tells you the number. <br />
              <span className="font-bold text-white">AirLens</span> shows you the reality.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-8"
          >
            <button
              onClick={() => navigate('/feed')}
              className="btn-gradient font-bold font-satoshi px-8 py-4 text-base shadow-2xl flex items-center gap-2 hover:scale-[1.02]"
            >
              Explore Reports <HiOutlineArrowRight size={18} />
            </button>
            {!isAuthenticated && (
              <>
                <button
                  onClick={() => openAuth('signup')}
                  className="btn-outline font-bold font-satoshi px-8 py-4 text-base bg-white/5 border-white/20 text-white hover:bg-white hover:text-emerald-950"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => openAuth('login')}
                  className="px-6 py-4 text-sm font-semibold font-satoshi text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </button>
              </>
            )}
          </motion.div>

          {/* Scroll Down Indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer text-white/55 hover:text-white transition-colors"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            <span className="text-xs uppercase tracking-widest font-bold font-satoshi">Scroll Down</span>
            <HiOutlineChevronDown size={20} />
          </motion.div>
        </div>
      </section>

      {/* ─── COMMUNITY IMPACT STATISTICS:COUNTER ─── */}
      <div className="relative w-full h-full z-10">
        <BgSequence />
        <section className="py-24 relative overflow-hidden bg-transparent">
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_right,rgba(46,125,50,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(46,125,50,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <FadeReveal>
              <div className="text-center mb-16">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Real-Time Contributions</h2>
                <p className="text-3xl sm:text-5xl font-extrabold font-heading" style={{ color: 'var(--text)' }}>
                  Community Impact
                </p>
              </div>
            </FadeReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: HiOutlineUpload, value: stats.totalReports || 12846, label: 'Community Reports', suffix: '' },
                { icon: HiOutlineGlobe, value: stats.totalCities || 1240, label: 'Cities Covered', suffix: '' },
                { icon: HiOutlineHeart, value: stats.totalLikes || 94000, label: 'Community Likes', suffix: '+' },
                { icon: HiOutlineEye, value: stats.totalConfirms || 54000, label: 'Pollution Confirmations', suffix: '' },
              ].map((stat, idx) => (
                <FadeReveal key={idx} delay={idx * 0.15}>
                  <div className="glass-card p-8 text-center rounded-2xl flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--mint)', color: 'var(--primary)' }}>
                      <stat.icon size={24} />
                    </div>
                    <div className="text-4xl sm:text-5xl font-black font-number mb-2" style={{ color: 'var(--text)' }}>
                      <AnimatedCounter value={stat.value} />{stat.suffix}
                    </div>
                    <div className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
                  </div>
                </FadeReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── STORYTELLING SCROLL SECTIONS ─── */}
        <section className="py-32 space-y-36">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            {/* Section 1: Image Left, Text Right */}
            <FadeReveal>
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="rounded-3xl overflow-hidden relative group aspect-video lg:aspect-auto lg:h-[450px]" style={{ boxShadow: 'var(--shadow-lg)' }}>
                  <img
                    src={industrialImg}
                    alt="Thick columns of black industrial smoke being pumped into a residential atmosphere"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                <div className="space-y-6">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>01 / Reality Check</span>
                  <h3 className="text-4xl sm:text-5xl font-extrabold font-heading tracking-tight" style={{ color: 'var(--text)' }}>
                    Documenting Atmospheric Haze
                  </h3>
                  <p className="text-lg leading-relaxed font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                    Industrial operations often sit right beside our residential zones, pumping toxic particulates into the shared skies. Official sensors provide static numbers, but numbers can feel abstract.
                  </p>
                  <p className="text-lg leading-relaxed font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                    By uploading photographic evidence, our community establishes an unfiltered record of environmental impact, showing exactly how industrial pollution envelopes active city neighborhoods.
                  </p>
                </div>
              </div>
            </FadeReveal>
          </div>

          {/* Section 2: Image Right, Text Left */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <FadeReveal>
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="lg:order-2 rounded-3xl overflow-hidden relative group aspect-video lg:aspect-auto lg:h-[450px]" style={{ boxShadow: 'var(--shadow-lg)' }}>
                  <img
                    src={vehicularImg}
                    alt="Densely packed traffic bumper-to-bumper with visible tailpipe smog in rush hour"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                <div className="lg:order-1 space-y-6">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>02 / Traffic Impact</span>
                  <h3 className="text-4xl sm:text-5xl font-extrabold font-heading tracking-tight" style={{ color: 'var(--text)' }}>
                    Exposing Transit Exhaust
                  </h3>
                  <p className="text-lg leading-relaxed font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                    Urban centers struggle with vehicular emissions on a massive scale. Everyday commuters inhale high levels of particulate matter and carbon monoxide during rush hour traffic bottlenecks.
                  </p>
                  <p className="text-lg leading-relaxed font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                    Your snapshots expose local emission violations and vehicular smog build-ups, supplying actionable context that helps environmental groups push for transit reforms.
                  </p>
                </div>
              </div>
            </FadeReveal>
          </div>

          {/* Section 3: Image Left, Community Mission Right */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <FadeReveal>
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="rounded-3xl overflow-hidden relative group aspect-video lg:aspect-auto lg:h-[450px]" style={{ boxShadow: 'var(--shadow-lg)' }}>
                  <img
                    src="https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800&q=80"
                    alt="Plastic foam floating on polluted river water banks"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                <div className="space-y-6">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>03 / Action Focus</span>
                  <h3 className="text-4xl sm:text-5xl font-extrabold font-heading tracking-tight" style={{ color: 'var(--text)' }}>
                    Protecting Natural Assets
                  </h3>
                  <p className="text-lg leading-relaxed font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                    Pollution extends beyond air. Our water bodies, parks, and marine lines are buried under plastic trash and industrial effluent discharges.
                  </p>
                  <p className="text-lg leading-relaxed font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                    AirLens helps you capture water contamination and illegal garbage dumping spots. Highlighting these visible problems triggers cleanup actions and community-led response drives.
                  </p>
                </div>
              </div>
            </FadeReveal>
          </div>
        </section>

        {/* ─── SECTION: HOW IT WORKS (VERTICAL TIMELINE) ─── */}
        <section className="py-32 relative bg-transparent">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <FadeReveal>
              <div className="text-center mb-20">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>How It Works</h2>
                <p className="text-3xl sm:text-5xl font-extrabold font-heading" style={{ color: 'var(--text)' }}>
                  The Reporting Workflow
                </p>
              </div>
            </FadeReveal>

            {/* Vertical Timeline */}
            <div className="relative border-l-2 ml-4 md:ml-32" style={{ borderColor: 'var(--border)' }}>
              {[
                { step: 'Step 1', title: '📷 Upload Pollution Sighting', desc: 'Identify and photograph instances of smog, water contamination, garbage combustion, or emissions in your surroundings. Add tags, location data, and date.' },
                { step: 'Step 2', title: '🌍 Community Review', desc: 'Sighted reports are published instantly to the local feed. Citizens inspect, discuss, and confirm findings with a single tap.' },
                { step: 'Step 3', title: '📍 Visual Mapping', desc: 'Confirmed reports are resolved onto our interactive map, matching community imagery with current official AQI statistics.' },
                { step: 'Step 4', title: '📈 Raise Awareness', desc: 'Public visual records raise alert levels for civic groups, government bodies, and schools to drive local environmental fixes.' }
              ].map((item, idx) => (
                <div key={idx} className="mb-16 last:mb-0 relative pl-8 md:pl-16">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full border-4 flex items-center justify-center text-xs font-black"
                    style={{ background: 'var(--bg)', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  >
                    {idx + 1}
                  </motion.div>

                  <FadeReveal delay={idx * 0.1}>
                    <div className="glass-card p-6 rounded-2xl">
                      <span className="text-xs font-bold uppercase font-heading tracking-wide" style={{ color: 'var(--primary)' }}>{item.step}</span>
                      <h4 className="text-xl font-bold font-heading mt-1 mb-3" style={{ color: 'var(--text)' }}>{item.title}</h4>
                      <p className="text-sm font-satoshi leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  </FadeReveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/*<section className="py-32 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <FadeReveal>
              <div className="text-center mb-16">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Explore Coverage</h2>
                <p className="text-3xl sm:text-5xl font-extrabold font-heading" style={{ color: 'var(--text)' }}>
                  Interactive Preview
                </p>
                <p className="text-md max-w-lg mx-auto font-satoshi mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Hover over glowing points to view local air quality stats and click to zoom into the full real-time database dashboard.
                </p>
              </div>
            </FadeReveal>

            <div className="grid lg:grid-cols-5 gap-12 items-center">
              <div className="lg:col-span-2 space-y-6">
                <FadeReveal>
                  <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>Currently Selected</span>

                    {hoveredCity ? (
                      <motion.div
                        key={hoveredCity.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-3"
                      >
                        <h4 className="text-3xl font-black font-heading" style={{ color: 'var(--text)' }}>{hoveredCity.name}</h4>

                        <div className="flex items-center gap-4 mt-4">
                          <div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>AQI Value</div>
                            <div className="text-2xl font-black font-number mt-1" style={{ color: hoveredCity.color }}>{hoveredCity.aqi}</div>
                          </div>
                          <div className="h-8 w-px bg-border" />
                          <div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Active Reports</div>
                            <div className="text-2xl font-black font-number mt-1" style={{ color: 'var(--primary)' }}>{hoveredCity.reports}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/map?city=${hoveredCity.name}`)}
                          className="btn-gradient w-full mt-6 py-3 font-semibold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01]"
                        >
                          Launch City Monitor <HiOutlineArrowRight size={14} />
                        </button>
                      </motion.div>
                    ) : (
                      <div className="mt-4 text-sm font-satoshi py-6 text-center" style={{ color: 'var(--text-muted)' }}>
                        👈 Hover over map dots to inspect AQI statistics.
                      </div>
                    )}
                  </div>
                </FadeReveal>

                <FadeReveal delay={0.2}>
                  <div className="p-4 rounded-xl border border-dashed text-xs font-satoshi text-center leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    Want to report local environmental issues in your hometown? <br />
                    <button onClick={() => openAuth('signup')} className="font-bold underline text-primary cursor-pointer">Register an account</button> to earn coin rewards.
                  </div>
                </FadeReveal>
              </div>

              <div className="lg:col-span-3 flex justify-center relative select-none">
                <FadeReveal delay={0.3}>
                  <div className="w-full max-w-[480px] aspect-[4/5] glass-card p-6 rounded-3xl relative overflow-hidden flex items-center justify-center">
                    /</div><div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,rgba(46,125,50,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(46,125,50,0.08)_1px,transparent_1px)] bg-[size:20px_20px]" />

                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/e/eb/India_map.svg"
                      alt="Real Map of India"
                      className="w-full h-full opacity-65 object-contain"
                      style={{ filter: 'var(--map-filter, drop-shadow(0px 8px 24px rgba(46,125,50,0.15)))' }}
                    />

                    {mapCities.map((city) => (
                      <div
                        key={city.name}
                        className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                        style={{ left: city.x, top: city.y }}
                        onMouseEnter={() => setHoveredCity(city)}
                        onClick={() => navigate(`/map?city=${city.name}`)}
                      >
                        <div className="absolute inset-0 rounded-full animate-ping opacity-45" style={{ background: city.color }} />

                        <div className="absolute inset-1 rounded-full border border-white/60 transition-transform group-hover:scale-125" style={{ background: city.color, boxShadow: '0 0 10px rgba(0,0,0,0.3)' }} />

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                          {city.name} ({city.aqi})
                        </div>
                      </div>
                    ))}
                  </div>
                </FadeReveal>
              </div>
            </div>
          </div>
        </section>*/}

        {/* ─── SECTION: COMMUNITY CALL-TO-ACTION ─── */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-mint/45 via-transparent to-transparent pointer-events-none" />

          <div className="max-w-4xl mx-auto px-6 text-center">
            <FadeReveal>
              <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tight mb-6" style={{ color: 'var(--text)' }}>
                Ready to Make a Difference?
              </h2>
              <p className="text-lg sm:text-xl mb-10 leading-relaxed font-satoshi max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Join thousands of citizens documenting environmental changes in their neighborhoods. Your report could highlight the reality that prompts real actions.
              </p>

              <div className="flex flex-wrap gap-4 justify-center">
                {!isAuthenticated && (
                  <button
                    onClick={() => openAuth('signup')}
                    className="btn-gradient px-10 py-5 text-base font-bold font-satoshi rounded-2xl shadow-2xl hover:scale-[1.01]"
                  >
                    Get Started Free
                  </button>
                )}
                <button
                  onClick={() => navigate('/feed')}
                  className="btn-outline px-10 py-5 text-base font-bold font-satoshi rounded-2xl shadow-2xl hover:scale-[1.01]"
                >
                  Browse Reports
                </button>
              </div>
            </FadeReveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 text-center text-xs font-satoshi tracking-wider border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <p className="font-semibold">© {new Date().getFullYear()} AirLens. For communities, by communities.</p>
          <p className="mt-2 text-[10px]">Data values sourced from community reports and WAQI API.</p>
        </footer>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}
