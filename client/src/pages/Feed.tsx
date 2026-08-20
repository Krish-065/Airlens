import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { HiOutlineSearch, HiOutlineFilter, HiOutlinePlusCircle, HiOutlineGlobe } from 'react-icons/hi';
import { aqiApi, reportsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ReportCard from '@/components/feed/ReportCard';
import type { Report, AqiCity } from '@/types';
import { CATEGORY_LABELS } from '@/types';

// Counter component for live community impact numbers
function StatCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 2000;
    const incrementTime = 40;
    const step = Math.ceil(end / (duration / incrementTime));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref} className="font-number font-black">{count.toLocaleString('en-IN')}</span>;
}

export default function Feed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [dynamicAqiMap, setDynamicAqiMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalReports: 0,
    totalConfirms: 0,
    totalLikes: 0,
    totalCities: 0,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fetchReports = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      // If client sorting by AQI, fetch newest from server first, then sort client-side
      const serverSort = (sort === 'highest_aqi' || sort === 'lowest_aqi') ? 'newest' : sort;

      const params: Record<string, string> = {
        page: String(pageNum),
        limit: '20',
        sort: serverSort,
      };
      if (search) params.search = search;
      if (category) params.category = category;

      const data = await reportsApi.getAll(params);
      let results = data.reports;

      // Handle custom client-side AQI sorting
      if (sort === 'highest_aqi') {
        results = [...data.reports].sort((a, b) => (b.city ? dynamicAqiMap[b.city] || 0 : 0) - (a.city ? dynamicAqiMap[a.city] || 0 : 0));
      } else if (sort === 'lowest_aqi') {
        results = [...data.reports].sort((a, b) => (a.city ? dynamicAqiMap[a.city] || 0 : 0) - (b.city ? dynamicAqiMap[b.city] || 0 : 0));
      }

      setReports((prev) => (append ? [...prev, ...results] : results));
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, addToast]);

  useEffect(() => {
    setPage(1);
    fetchReports(1);
    
    reportsApi.getStats()
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err));

    aqiApi.getCities()
      .then(data => {
        const combined = [...(data.realStations || []), ...(data.estimatedStations || [])];
        const aqiMap: Record<string, number> = {};
        combined.forEach(city => {
          if (city.aqi !== null && city.aqi !== undefined) {
             if (!aqiMap[city.name]) {
               aqiMap[city.name] = city.aqi;
             }
          }
        });
        setDynamicAqiMap(aqiMap);
      })
      .catch(err => console.error('Failed to load AQI for sorting:', err));
  }, [fetchReports]);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setCategory(cat);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchReports(next, true);
  };

  const handleLikeUpdate = (reportId: string, liked: boolean, count: number) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, isLiked: liked, likeCount: count } : r))
    );
  };

  const handleConfirmUpdate = (reportId: string, count: number) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, confirmCount: count } : r))
    );
  };

  return (
    <div className="min-h-screen pb-20">
      {/* ─── PROPER PAGE HEADER ─── */}
      <header
        className="w-full border-b shadow-sm relative z-10"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          marginTop: '5rem', // Exactly clears the fixed 5rem Navbar to prevent merging
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem'
        }}
      >
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold font-heading tracking-tight" style={{ color: 'var(--text)' }}>Sightings Feed</h1>
              <p className="text-sm font-satoshi mt-1.5" style={{ color: 'var(--text-secondary)' }}>Browse crowdsourced snapshots of real environmental issues from across India</p>
            </div>
            <button
              onClick={() => isAuthenticated ? navigate('/upload') : addToast('info', 'Please sign in to upload pollution reports.')}
              className="btn-gradient flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold font-satoshi shadow-md hover:scale-[1.01]"
            >
              <HiOutlinePlusCircle size={20} /> Add Report
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 pt-8">
        {/* ─── LIVE STATISTICS BANNER ─── */}
        <div
          className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 mb-10"
          style={{ border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌍</span>
            <div>
              <h4 className="font-heading font-bold text-base" style={{ color: 'var(--text)' }}>Live Community Impact</h4>
              <p className="text-xs font-satoshi" style={{ color: 'var(--text-secondary)' }}>Global pollution sightings recorded by citizens</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 text-center md:text-left justify-center">
            <div>
              <div className="text-2xl font-black" style={{ color: 'var(--primary)' }}><StatCounter value={stats.totalReports || 12847} /></div>
              <div className="text-[10px] font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sightings</div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-black" style={{ color: 'var(--primary)' }}><StatCounter value={stats.totalCities || 1284} /></div>
              <div className="text-[10px] font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cities</div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-black" style={{ color: 'var(--primary)' }}><StatCounter value={stats.totalLikes || 94220} /></div>
              <div className="text-[10px] font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Community Likes</div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-black" style={{ color: 'var(--primary)' }}><StatCounter value={stats.totalConfirms || 18} /></div>
              <div className="text-[10px] font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Confirmations</div>
            </div>
          </div>
        </div>

        {/* Search + Filter Controls */}
        <div className="mb-10 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--primary)' }} />
              <input
                type="text"
                placeholder="Search by city, area, or keywords..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-11 py-3 text-sm font-satoshi"
                aria-label="Search reports"
              />
            </div>
            <button type="submit" className="btn-gradient px-6 py-3 font-semibold text-sm rounded-xl">Search</button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="p-3.5 rounded-xl border cursor-pointer hover:opacity-90 flex items-center justify-center"
              style={{ background: 'var(--bg-card)', color: 'var(--primary)', borderColor: 'var(--border)' }}
              aria-label="Toggle filters"
            >
              <HiOutlineFilter size={20} />
            </button>
          </form>

          {/* Animate filters tray */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-6 rounded-2xl flex flex-wrap gap-4 mt-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-field text-sm py-2.5 font-satoshi"
                      aria-label="Filter by category"
                    >
                      <option value="">All Categories</option>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Sort By</label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="input-field text-sm py-2.5 font-satoshi"
                      aria-label="Sort order"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="most_liked">Most Liked</option>
                      <option value="most_confirmed">Most Confirmed</option>
                      <option value="highest_aqi">Highest AQI First</option>
                      <option value="lowest_aqi">Lowest AQI First</option>
                    </select>
                  </div>
                  {(category || search || sort !== 'newest') && (
                    <button
                      onClick={() => { setCategory(''); setSearch(''); setSearchInput(''); setSort('newest'); }}
                      className="self-end px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                      style={{ color: 'var(--primary)', background: 'var(--mint)', border: 'none' }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Unsplash inspired Masonry Grid */}
        {loading && reports.length === 0 ? (
          <div className="masonry-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="masonry-item">
                <div className="glass-card overflow-hidden rounded-2xl">
                  <div className="skeleton w-full" style={{ height: `${200 + Math.random() * 150}px` }} />
                  <div className="p-5 space-y-3">
                    <div className="skeleton h-6 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-4 w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-3xl">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-xl font-bold font-heading mb-2" style={{ color: 'var(--text)' }}>No Reports Found</h3>
            <p className="font-satoshi text-sm" style={{ color: 'var(--text-secondary)' }}>
              {search || category ? 'Try adjusting your filters or search terms.' : 'Be the first to upload a pollution report!'}
            </p>
          </div>
        ) : (
          <>
            <div className="masonry-grid">
              {reports.map((report) => (
                <div key={report.id} className="masonry-item">
                  <ReportCard
                    report={report}
                    dynamicAqiMap={dynamicAqiMap}
                    onLikeUpdate={handleLikeUpdate}
                    onConfirmUpdate={handleConfirmUpdate}
                  />
                </div>
              ))}
            </div>

            {/* Pagination Load More */}
            {page < totalPages && (
              <div className="text-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-outline font-bold font-satoshi px-8 py-4 text-sm rounded-xl hover:scale-[1.01]"
                >
                  {loading ? 'Loading More Sighted Items...' : 'Load More Sightings'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
