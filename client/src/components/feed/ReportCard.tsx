import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiHeart, HiOutlineHeart, HiOutlineEye, HiOutlineCalendar, HiOutlineLocationMarker } from 'react-icons/hi';
import { reportsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Report } from '@/types';
import { CATEGORY_LABELS } from '@/types';

interface Props {
  report: Report;
  onLikeUpdate: (id: string, liked: boolean, count: number) => void;
  onConfirmUpdate: (id: string, count: number) => void;
  dynamicAqiMap?: Record<string, number>;
}

// Global helper for computing report severity badges based on city AQI or category fallback
export const getSeverityDetails = (city: string | null, category: string, dynamicAqiMap?: Record<string, number>) => {
  const cityAqiMap: Record<string, number> = {
    Delhi: 312, Mumbai: 118, Bangalore: 62, Chennai: 92, Kolkata: 184,
    Hyderabad: 105, Pune: 88, Ahmedabad: 142, Jaipur: 125, Lucknow: 165,
    Kanpur: 245, Nagpur: 74, Indore: 95, Bhopal: 82, Visakhapatnam: 71,
    Patna: 215, Varanasi: 198, Agra: 185, Chandigarh: 102, Gurgaon: 280,
    Noida: 275, Faridabad: 290, Jodhpur: 148, Surat: 98, Amritsar: 154, Ranchi: 112
  };
  
  let aqi: number | null = null;
  if (dynamicAqiMap && city && dynamicAqiMap[city] !== undefined) {
    aqi = dynamicAqiMap[city];
  } else if (city && cityAqiMap[city] !== undefined) {
    aqi = cityAqiMap[city];
  }
  
  if (aqi !== null) {
    if (aqi <= 50) return { label: '🟢 Low', color: '#2E7D32', border: '#DDEEDD', bg: '#EDF7ED', aqi };
    if (aqi <= 100) return { label: '🟡 Moderate', color: '#D4A373', border: '#FFF3CD', bg: '#FFFDF0', aqi };
    if (aqi <= 150) return { label: '🟠 High', color: '#F97316', border: '#FFE8D6', bg: '#FFF5EB', aqi };
    if (aqi <= 200) return { label: '🔴 Severe', color: '#EF4444', border: '#FEE2E2', bg: '#FEF2F2', aqi };
    return { label: '🟣 Hazardous', color: '#8B5CF6', border: '#F3E8FF', bg: '#FAF5FF', aqi };
  }
  
  switch (category) {
    case 'INDUSTRIAL':
    case 'FOREST_FIRE_CROP_BURNING':
      return { label: '🔴 Severe', color: '#EF4444', border: '#FEE2E2', bg: '#FEF2F2', aqi: null };
    case 'VEHICULAR':
    case 'GARBAGE_BURNING':
      return { label: '🟠 High', color: '#F97316', border: '#FFE8D6', bg: '#FFF5EB', aqi: null };
    case 'WATER_POLLUTION':
    case 'CONSTRUCTION_DUST':
    case 'PLASTIC_WASTE':
      return { label: '🟡 Moderate', color: '#D4A373', border: '#FFF3CD', bg: '#FFFDF0', aqi: null };
    default:
      return { label: '🟢 Low', color: '#2E7D32', border: '#DDEEDD', bg: '#EDF7ED', aqi: null };
  }
};

export default function ReportCard({ report, onLikeUpdate, onConfirmUpdate, dynamicAqiMap }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [liking, setLiking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [burstingLeaves, setBurstingLeaves] = useState<{ id: number; x: number; y: number; rotate: number }[]>([]);
  const { isAuthenticated, sessionId } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast('info', 'Please login to like this report.');
      return;
    }
    if (liking) return;
    setLiking(true);
    try {
      if (report.isLiked) {
        const data = await reportsApi.unlike(report.id);
        onLikeUpdate(report.id, false, data.likeCount);
      } else {
        const data = await reportsApi.like(report.id);
        onLikeUpdate(report.id, true, data.likeCount);
        addToast('success', '🍃 Liked!');
        
        // Trigger exploding leaves
        const leaves = Array.from({ length: 8 }).map((_, i) => ({
          id: Date.now() + i,
          x: (Math.random() - 0.5) * 120, 
          y: (Math.random() - 0.5) * 120 - 40,
          rotate: Math.random() * 360,
        }));
        setBurstingLeaves(leaves);
        
        setTimeout(() => {
          setBurstingLeaves([]);
        }, 1000);
      }
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setLiking(false);
    }
  };

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) return;
    setConfirming(true);
    try {
      const data = await reportsApi.confirm(report.id, isAuthenticated ? undefined : sessionId);
      onConfirmUpdate(report.id, data.confirmCount);
      addToast('success', '👀 Sighting confirmed!');
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const severity = getSeverityDetails(report.city, report.category, dynamicAqiMap);

  const getOptimizedImageUrl = (url: string) => {
    if (!url) return '';
    
    // Robustly optimize Unsplash images (they use Imgix under the hood)
    if (url.includes('images.unsplash.com')) {
      try {
        const u = new URL(url);
        u.searchParams.set('w', '500');
        u.searchParams.set('q', '50');
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        return u.toString();
      } catch (e) {
        return url;
      }
    }
    
    // Cloudinary dynamic transformations are risky if strict mode is enabled on the account,
    // so we will rely on the upload-time transformations (1200px, auto quality).
    return url;
  };

  const optimizedUrl = getOptimizedImageUrl(report.imageUrl);

  return (
    <div
      className="glass-card overflow-hidden cursor-pointer group flex flex-col h-full rounded-2xl hover:scale-[1.01]"
      onClick={() => navigate(`/report/${report.id}`)}
      role="article"
      aria-label={report.title}
    >
      {/* Visual Header Panel */}
      <div className="relative overflow-hidden aspect-video">
        {!imgLoaded && !imgError && <div className="skeleton w-full h-full absolute inset-0" />}
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 absolute inset-0" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            <span className="text-4xl">📸</span>
            <span className="text-xs font-semibold font-satoshi">No Image Sighting</span>
          </div>
        ) : (
          <img
            src={optimizedUrl}
            alt={report.title}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
        
        {/* Category Pill Tag */}
        <span
          className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[10px] font-bold font-satoshi uppercase tracking-wider text-white"
          style={{ background: 'rgba(7, 26, 18, 0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {CATEGORY_LABELS[report.category] || 'Sighting'}
        </span>

        {/* Severity Badge overlay */}
        <span
          className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold font-satoshi border uppercase tracking-wider"
          style={{ background: severity.bg, color: severity.color, borderColor: severity.border }}
        >
          {severity.label}
        </span>
      </div>

      {/* Info Body */}
      <div className="p-5 flex flex-col justify-between flex-1 gap-4">
        <div>
          <h3 className="font-heading font-bold text-lg mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>
            {report.title}
          </h3>

          <div className="flex items-center gap-4 text-xs font-satoshi" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1"><HiOutlineCalendar size={14} /> {formatDate(report.reportDate)}</span>
            {report.city && <span className="flex items-center gap-1 font-semibold text-primary"><HiOutlineLocationMarker size={14} /> {report.city}</span>}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs font-medium font-satoshi" style={{ color: 'var(--text-muted)' }}>
            By <span className="font-semibold text-slate-800" style={{ color: 'var(--text)' }}>{report.authorName || report.user?.name || 'Anonymous'}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Likes */}
            <div className="relative">
              <AnimatePresence>
                {burstingLeaves.map((leaf) => (
                  <motion.div
                    key={leaf.id}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: leaf.x, y: leaf.y, scale: 1.5, opacity: 0, rotate: leaf.rotate }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg pointer-events-none z-10"
                  >
                    🍃
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                className="flex items-center gap-1.5 text-xs font-bold font-number cursor-pointer px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                style={{
                  color: report.isLiked ? '#2E7D32' : 'var(--text-secondary)',
                }}
                aria-label={`Like report. ${report.likeCount} likes`}
              >
                {report.isLiked ? <span className="text-base leading-none">🍃</span> : <HiOutlineHeart size={16} />}
                <span>{report.likeCount}</span>
              </motion.button>
            </div>

            {/* Confirmations */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleConfirm}
              className="flex items-center gap-1.5 text-xs font-bold font-number cursor-pointer px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label={`Confirm report. ${report.confirmCount} confirmations`}
            >
              <HiOutlineEye size={16} style={{ color: 'var(--primary)' }} />
              <span>{report.confirmCount}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
