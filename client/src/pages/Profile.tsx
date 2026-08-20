import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineUpload, HiOutlineHeart, HiOutlineEye, HiOutlineCalendar } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { usersApi } from '@/lib/api';
import type { Report } from '@/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ reportCount: 0, likeCount: 0, confirmCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/');
      return;
    }
    (async () => {
      try {
        const [profileData, reportsData] = await Promise.all([
          usersApi.getProfile(user.id),
          usersApi.getReports(user.id, { limit: '20' }),
        ]);
        setStats({
          reportCount: profileData.user.reportCount,
          likeCount: profileData.user.likeCount,
          confirmCount: profileData.user.confirmCount,
        });
        setReports(reportsData.reports);
      } catch (err: any) {
        addToast('error', err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAuthenticated, navigate, addToast]);

  if (!user) return null;

  // Compute uploader level from coins: level 1 is baseline, +1 level every 50 coins
  const userLevel = Math.floor((user.coins ?? 0) / 50) + 1;

  const statItems = [
    { icon: HiOutlineUpload, value: stats.reportCount, label: 'Reports Sighted', color: 'var(--primary)' },
    { icon: HiOutlineHeart, value: stats.likeCount, label: 'Likes Received', color: '#EF4444' },
    { icon: HiOutlineEye, value: stats.confirmCount, label: 'Confirmations Passed', color: '#3B82F6' },
  ];

  // Dynamic achievement badges based on user contribution metrics
  const achievementBadges = [
    {
      id: 'first_alert',
      icon: '🌿',
      name: 'First Alert',
      desc: 'Submitted first pollution report',
      unlocked: stats.reportCount >= 1,
    },
    {
      id: 'active_sentinel',
      icon: '🌲',
      name: 'Active Sentinel',
      desc: 'Sighted 5+ pollution reports',
      unlocked: stats.reportCount >= 5,
    },
    {
      id: 'eco_earner',
      icon: '🪙',
      name: 'Eco Earner',
      desc: 'Earned 50+ community coins',
      unlocked: (user.coins ?? 0) >= 50,
    },
    {
      id: 'verifier',
      icon: '🔍',
      name: 'Verifier',
      desc: 'Verified 3+ report details',
      unlocked: stats.confirmCount >= 3,
    },
  ];

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-10 mb-8 text-center rounded-3xl relative overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

          {/* Large Avatar */}
          <div 
            className="w-28 h-28 rounded-3xl mx-auto mb-5 flex items-center justify-center text-4xl font-extrabold text-white shadow-lg"
            style={{ background: 'var(--gradient-btn)' }}
          >
            {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
          </div>

          <h1 className="text-3xl font-extrabold font-heading tracking-tight" style={{ color: 'var(--text)' }}>
            {user.name || 'Anonymous User'}
          </h1>
          <p className="text-sm font-satoshi mt-1 mb-5" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Level indicator */}
            <span 
              className="px-4 py-2 rounded-xl text-xs font-extrabold font-satoshi uppercase tracking-wider border bg-white"
              style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
            >
              ⭐ Level {userLevel} Reporter
            </span>

            {/* Coin Balance panel */}
            <span 
              className="px-4 py-2 rounded-xl text-xs font-black font-number flex items-center gap-1.5"
              style={{ background: 'var(--mint)', color: 'var(--primary)' }}
            >
              🪙 {user.coins ?? 0} Coins
            </span>
          </div>
        </motion.div>

        {/* Counter Stats Blocks */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {statItems.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-6 text-center rounded-2xl"
              style={{ border: '1px solid var(--border)' }}
            >
              <s.icon size={24} style={{ color: s.color }} className="mx-auto mb-2" />
              <div className="text-2xl sm:text-3xl font-black font-number mb-1" style={{ color: 'var(--text)' }}>
                {loading ? '–' : s.value}
              </div>
              <div className="text-[10px] font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Achievements / Badges Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6 md:p-8 mb-10 rounded-2xl"
          style={{ border: '1px solid var(--border)' }}
        >
          <h3 className="text-lg font-bold font-heading mb-4" style={{ color: 'var(--text)' }}>🏆 Contribution Badges</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {achievementBadges.map((badge) => (
              <div 
                key={badge.id}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${badge.unlocked ? 'bg-mint/20 border-primary/20 opacity-100 scale-100' : 'bg-secondary/5 border-border opacity-40 scale-[0.98]'}`}
                style={{ borderColor: badge.unlocked ? 'var(--border)' : 'rgba(0,0,0,0.06)' }}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <h5 className="font-bold text-xs font-satoshi" style={{ color: 'var(--text)' }}>{badge.name}</h5>
                <p className="text-[10px] font-satoshi mt-1" style={{ color: 'var(--text-secondary)' }}>{badge.desc}</p>
                {badge.unlocked ? (
                  <span className="text-[9px] font-bold text-primary font-satoshi uppercase tracking-wide mt-2">Unlocked</span>
                ) : (
                  <span className="text-[9px] font-semibold text-gray-400 font-satoshi uppercase tracking-wide mt-2">Locked</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* User's uploaded reports section */}
        <div>
          <h3 className="text-xl font-bold font-heading mb-5" style={{ color: 'var(--text)' }}>My Uploaded Reports</h3>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-4 rounded-2xl">
                  <div className="skeleton h-40 w-full mb-3 rounded-xl" />
                  <div className="skeleton h-5 w-3/4 mb-2" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-card p-10 text-center rounded-2xl" style={{ border: '1px solid var(--border)' }}>
              <div className="text-5xl mb-4">📸</div>
              <p className="font-satoshi text-sm" style={{ color: 'var(--text-secondary)' }}>
                You have not uploaded any reports yet.
              </p>
              <button 
                onClick={() => navigate('/upload')} 
                className="btn-gradient mt-6 font-bold font-satoshi px-6 py-3 text-xs uppercase tracking-wider rounded-xl shadow-md"
              >
                Upload Sighting Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {reports.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/report/${r.id}`)}
                  className="glass-card overflow-hidden cursor-pointer group rounded-2xl hover:scale-[1.01]"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <div className="h-44 overflow-hidden relative">
                    <img 
                      src={r.imageUrl} 
                      alt={r.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      loading="lazy" 
                    />
                    <span 
                      className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold font-satoshi uppercase tracking-wider text-white"
                      style={{ background: CATEGORY_COLORS[r.category] }}
                    >
                      {CATEGORY_LABELS[r.category]}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-sm font-heading line-clamp-1 leading-snug group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>
                      {r.title}
                    </h4>
                    <div className="flex items-center gap-4 mt-3 text-[10px] font-satoshi" style={{ color: 'var(--text-muted)' }}>
                      <span>❤️ {r.likeCount} Likes</span>
                      <span>👀 {r.confirmCount} Spotted</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
