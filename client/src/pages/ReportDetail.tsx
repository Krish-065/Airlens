import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import { TileLayer } from 'react-leaflet';
import { useTheme } from '@/context/ThemeContext';
import { HiHeart, HiOutlineHeart, HiOutlineEye, HiOutlineCalendar, HiOutlineArrowLeft, HiOutlineLocationMarker } from 'react-icons/hi';
import { Flag } from 'lucide-react';
import { reportsApi, moderationApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CATEGORY_LABELS } from '@/types';
import type { Report } from '@/types';
import { getSeverityDetails } from '@/components/feed/ReportCard';
import CommentsSection from '@/components/report/CommentsSection';
import { aqiApi } from '@/lib/api';

const REPORT_CATEGORIES = [
  'Spam',
  'Harassment or Hate Speech',
  'False Information',
  'Inappropriate Content',
  'Other'
];

// Predefined coordinate map for mapping reports by city
const cityCoordinatesMap: Record<string, [number, number]> = {
  Delhi: [28.6139, 77.2090],
  Mumbai: [19.0760, 72.8777],
  Bangalore: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Hyderabad: [17.3850, 78.4867],
  Pune: [18.5204, 73.8567],
  Ahmedabad: [23.0225, 72.5714],
  Jaipur: [26.9124, 75.7873],
  Lucknow: [26.8467, 80.9462],
  Kanpur: [26.4499, 80.3319],
  Nagpur: [21.1458, 79.0882],
  Indore: [22.7196, 75.8577],
  Bhopal: [23.2599, 77.4126],
  Visakhapatnam: [17.6868, 83.2185],
  Patna: [25.6093, 85.1376],
  Varanasi: [25.3176, 82.9739],
  Agra: [27.1767, 78.0081],
  Chandigarh: [30.7333, 76.7794],
  Guwahati: [26.1445, 91.7362],
  Thiruvananthapuram: [8.5241, 76.9366],
  Kochi: [9.9312, 76.2673],
  Coimbatore: [11.0168, 76.9558],
  Amritsar: [31.6340, 74.8723],
  Ranchi: [23.3441, 85.3096],
  Gurgaon: [28.4595, 77.0266],
  Noida: [28.5355, 77.3910],
  Faridabad: [28.4089, 77.3178],
  Jodhpur: [26.2389, 73.0243],
  Surat: [21.1702, 72.8311],
};

function ThemeTileLayer() {
  const { theme } = useTheme();
  const lightTile = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  return (
    <TileLayer
      url={theme === 'dark' ? darkTile : lightTile}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
    />
  );
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [dynamicAqiMap, setDynamicAqiMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, sessionId, token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'REPORT' | 'COMMENT' | 'REPLY'>('REPORT');
  const [reportTargetId, setReportTargetId] = useState<string>('');
  const [reportReason, setReportReason] = useState(REPORT_CATEGORIES[0]);
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await reportsApi.getById(id);
        setReport(data);
        
        if (data.city) {
          try {
            const cityData = await aqiApi.getCity(data.city);
            if (cityData && cityData.aqi !== undefined && cityData.aqi !== null) {
              setDynamicAqiMap({ [data.city]: cityData.aqi });
            }
          } catch (e) {
            console.error('Failed to load dynamic AQI for ReportDetail', e);
          }
        }
      } catch (err: any) {
        addToast('error', err.message || 'Failed to load report');
        navigate('/feed');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, addToast, navigate]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      addToast('info', 'Please login to like this report.');
      return;
    }
    if (!report) return;
    try {
      if (report.isLiked) {
        const d = await reportsApi.unlike(report.id);
        setReport({ ...report, isLiked: false, likeCount: d.likeCount });
      } else {
        const d = await reportsApi.like(report.id);
        setReport({ ...report, isLiked: true, likeCount: d.likeCount });
        addToast('success', '❤️ Liked!');
      }
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleConfirm = async () => {
    if (!report) return;
    try {
      const d = await reportsApi.confirm(report.id, isAuthenticated ? undefined : sessionId);
      setReport({ ...report, isConfirmed: true, confirmCount: d.confirmCount });
      addToast('success', '👀 Confirmed! Thanks for verifying.');
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleOpenReportModal = (type: 'REPORT' | 'COMMENT' | 'REPLY', targetId: string) => {
    if (!isAuthenticated) {
      addToast('info', 'Please login to report content');
      return;
    }
    setReportType(type);
    setReportTargetId(targetId);
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await moderationApi.submitReport({
        targetType: reportType,
        targetId: reportTargetId,
        reason: reportReason,
        details: reportDetails
      });
      addToast('success', 'Report submitted for review');
      setReportModalOpen(false);
      setReportReason(REPORT_CATEGORIES[0]);
      setReportDetails('');
    } catch (err: any) {
      addToast('error', 'Failed to submit report');
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen pt-32">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="skeleton h-10 w-32 mb-6" />
          <div className="skeleton w-full h-[400px] rounded-3xl mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="skeleton h-12 w-3/4" />
              <div className="skeleton h-6 w-1/2" />
              <div className="skeleton h-40 w-full" />
            </div>
            <div className="space-y-4">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const severity = getSeverityDetails(report.city, report.category, dynamicAqiMap);
  const locationCoords = report.city ? cityCoordinatesMap[report.city] : null;

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

        {/* Navigation back bar */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-wider cursor-pointer border rounded-xl px-4 py-3 hover:opacity-90 transition-all"
          style={{ background: 'var(--mint)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          <HiOutlineArrowLeft size={16} /> Back to Feed
        </motion.button>

        {/* Cinematic Header Image */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden mb-12 shadow-2xl aspect-[21/9] max-h-[500px]"
        >
          <img
            src={report.imageUrl}
            alt={report.title}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-3 gap-12 items-start">

          {/* Left Column: Details & Map */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-3xl sm:text-5xl font-black font-heading leading-tight" style={{ color: 'var(--text)' }}>
                {report.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-xs font-satoshi" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5"><HiOutlineCalendar size={15} /> {formatDate(report.reportDate)}</span>
                {report.city && <span className="flex items-center gap-1.5 font-semibold text-primary"><HiOutlineLocationMarker size={15} /> {report.city}{report.area ? `, ${report.area}` : ''}</span>}
                <span>By <span className="font-semibold text-slate-800" style={{ color: 'var(--text)' }}>{report.authorName || report.user?.name || 'Anonymous'}</span></span>
              </div>
            </motion.div>

            {/* Description Text block */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-8 rounded-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Sighting Description</h4>
                <button
                  onClick={() => handleOpenReportModal('REPORT', report.id)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Flag size={14} />
                  Report
                </button>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap font-satoshi text-base" style={{ color: 'var(--text)' }}>
                {report.description}
              </p>
            </motion.div>

            <CommentsSection
              reportId={report.id}
              onReportContent={handleOpenReportModal}
            />

            {/* Map Container - Rendered conditionally if coordinates resolved */}
            {locationCoords && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <h3 className="text-lg font-bold font-heading" style={{ color: 'var(--text)' }}>Report Location</h3>
                </div>
                <div
                  className="w-full h-80 rounded-3xl overflow-hidden border shadow-lg relative z-10"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <MapContainer
                    center={locationCoords}
                    zoom={12}
                    className="w-full h-full"
                    zoomControl={true}
                    scrollWheelZoom={false}
                  >
                    <ThemeTileLayer />
                    <Marker position={locationCoords}>
                      <Popup>
                        <div className="font-satoshi p-1">
                          <h5 className="font-bold text-sm mb-1">{report.city}</h5>
                          <p className="text-xs text-gray-500">{report.area || 'Sighting hotspot'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Interaction Sidebar */}
          <div className="space-y-6">

            {/* Badges Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-2xl space-y-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Sighting Badges</h4>

              <div className="flex flex-col gap-3">
                {/* AQI Badge */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <span className="text-xs font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>AQI Reference</span>
                  <span className="text-sm font-black font-number px-3 py-1 rounded-lg text-white" style={{ background: severity.color }}>
                    {severity.aqi ?? 'N/A'}
                  </span>
                </div>

                {/* Severity Badge */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <span className="text-xs font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Severity</span>
                  <span
                    className="text-xs font-black font-satoshi uppercase tracking-wider px-3 py-1 rounded-lg border"
                    style={{ background: severity.bg, color: severity.color, borderColor: severity.border }}
                  >
                    {severity.label.replace('🟢 ', '').replace('🟡 ', '').replace('🟠 ', '').replace('🔴 ', '').replace('🟣 ', '')}
                  </span>
                </div>

                {/* Category Badge */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <span className="text-xs font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Category</span>
                  <span className="text-xs font-semibold font-satoshi" style={{ color: 'var(--text)' }}>
                    {CATEGORY_LABELS[report.category]}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Actions Trigger Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 rounded-2xl flex flex-col gap-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Verifications</h4>

              {/* Like Sighting Button */}
              <button
                onClick={handleLike}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold font-satoshi text-sm border shadow-sm transition-all hover:scale-[1.01]"
                style={{
                  background: report.isLiked ? 'rgba(239,68,68,0.08)' : 'var(--bg-secondary)',
                  color: report.isLiked ? '#EF4444' : 'var(--text)',
                  borderColor: report.isLiked ? 'rgba(239,68,68,0.2)' : 'var(--border)',
                }}
              >
                {report.isLiked ? <HiHeart size={20} /> : <HiOutlineHeart size={20} />}
                <span>{report.likeCount} {report.likeCount === 1 ? 'Like Sighting' : 'Likes'}</span>
              </button>

              {/* Confirm Sighting Button */}
              <button
                onClick={handleConfirm}
                disabled={report.isConfirmed}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold font-satoshi text-sm border shadow-sm transition-all hover:scale-[1.01] disabled:opacity-55 disabled:cursor-not-allowed"
                style={{
                  background: report.isConfirmed ? 'var(--mint)' : 'var(--primary)',
                  color: report.isConfirmed ? 'var(--primary)' : 'white',
                  borderColor: report.isConfirmed ? 'var(--border)' : 'transparent',
                }}
              >
                <HiOutlineEye size={20} />
                <span>
                  {report.isConfirmed ? 'Spotted This Too' : 'I Spotted This Too'} ({report.confirmCount})
                </span>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-white/10 p-6 rounded-2xl max-w-md w-full"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Report Content</h3>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
                >
                  {REPORT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Additional Details (Optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 resize-none"
                  placeholder="Provide more context..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
