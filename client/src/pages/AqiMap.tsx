import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { aqiApi, reportsApi } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import type { AqiCity, Report } from '@/types';
import { HiOutlineSearch, HiOutlineLocationMarker, HiOutlineFilter, HiOutlineCalendar } from 'react-icons/hi';
import { Map as MapIcon, X, Search, Image as ImageIcon } from 'lucide-react';

const INDIA_CENTER: [number, number] = [22.5, 79.0];
const INDIA_ZOOM = 5;

const AQI_LEGEND = [
  { range: '0–50', label: 'Good', color: '#2E7D32', bg: '#EDF7ED' },
  { range: '51–100', label: 'Moderate', color: '#D4A373', bg: '#FFFDF0' },
  { range: '101–150', label: 'Sensitive', color: '#F97316', bg: '#FFF5EB' },
  { range: '151–200', label: 'Unhealthy', color: '#EF4444', bg: '#FEF2F2' },
  { range: '201–300', label: 'Very Unhealthy', color: '#9C27B0', bg: '#FAF5FF' },
  { range: '300+', label: 'Hazardous', color: '#7B1FA2', bg: '#FAF5FF' },
];

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

// Controller component to pan/zoom the map dynamically
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function AqiMap() {
  const [cities, setCities] = useState<AqiCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<AqiCity | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [aqiFilter, setAqiFilter] = useState('all');
  const [mapMode, setMapMode] = useState<'all' | 'uploaded'>('all');
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [stationReportsMap, setStationReportsMap] = useState<Map<number | string, Report[]>>(new Map());

  // Right drawer reports list
  const [cityReports, setCityReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Load cities from API
  useEffect(() => {
    (async () => {
      try {
        const data = await aqiApi.getCities();
        const combined = [...(data.realStations || []), ...(data.estimatedStations || [])];
        setCities(combined);

        // Check if query param includes default city selection
        const cityParam = searchParams.get('city');
        if (cityParam) {
          const match = combined.find((c) => c.name.toLowerCase() === cityParam.toLowerCase());
          if (match) setSelectedCity(match);
        }
      } catch (err: any) {
        addToast('error', err.message || 'Failed to load AQI data');
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast, searchParams]);

  // Calculate great circle distance
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch all reports
  useEffect(() => {
    (async () => {
      try {
        const res = await reportsApi.getAll({ limit: '1000' });
        setAllReports(res.reports);
      } catch (err) {
        console.error('Failed to load reports', err);
      }
    })();
  }, []);

  // Compute stationReportsMap
  useEffect(() => {
    if (cities.length === 0 || allReports.length === 0) return;
    
    const newMap = new Map<number | string, Report[]>();
    
    allReports.forEach(report => {
      if (report.lat && report.lng) {
        let minDest = Infinity;
        let nearestStation: AqiCity | null = null;
        for (const city of cities) {
          const d = getDistanceKm(report.lat, report.lng, city.lat, city.lng);
          if (d < minDest) {
            minDest = d;
            nearestStation = city;
          }
        }
        if (nearestStation && nearestStation.id !== undefined) {
           const existing = newMap.get(nearestStation.id) || [];
           existing.push(report);
           newMap.set(nearestStation.id, existing);
        }
      }
    });
    setStationReportsMap(newMap);
  }, [cities, allReports]);

  // Set cityReports when city selected
  useEffect(() => {
    if (!selectedCity || selectedCity.id === undefined) {
      setCityReports([]);
      return;
    }
    setCityReports(stationReportsMap.get(selectedCity.id) || []);
  }, [selectedCity, stationReportsMap]);

  // Filter cities list based on search, range filters, and map mode
  const finalCities = cities.filter((city) => {
    if (mapMode === 'uploaded') {
      if (city.id === undefined) return false;
      const reps = stationReportsMap.get(city.id) || [];
      return reps.length > 0;
    }
    return true;
  });

  const filteredCities = finalCities.filter((city) => {
    const matchesSearch = city.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (aqiFilter === 'all') return matchesSearch;
    if (aqiFilter === 'good') return matchesSearch && (city.aqi ?? 0) <= 50;
    if (aqiFilter === 'moderate') return matchesSearch && (city.aqi ?? 0) > 50 && (city.aqi ?? 0) <= 100;
    if (aqiFilter === 'unhealthy') return matchesSearch && (city.aqi ?? 0) > 100;
    return matchesSearch;
  });

  const getMapCenter = (): [number, number] => {
    if (selectedCity) return [selectedCity.lat, selectedCity.lng];
    return INDIA_CENTER;
  };

  const getMapZoom = (): number => {
    if (selectedCity) return 9;
    return INDIA_ZOOM;
  };

  return (
    <div className="flex relative overflow-hidden" style={{ height: 'calc(100vh - 5rem)', marginTop: '5rem' }}>

      {/* ─── LEFT SIDEBAR: Search, Filters, & Legend ─── */}
      <div
        className="w-80 h-full hidden lg:flex flex-col border-r shrink-0 z-30 overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-glass-heavy)', backdropFilter: 'blur(20px)' }}
      >
        <div className="p-6 border-b space-y-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>City AQI Monitor</h1>
            <p className="text-xs font-satoshi" style={{ color: 'var(--text-secondary)' }}>Live air indices across Indian hubs</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.length > 2) {
                  const match = cities.find((c) => c.name.toLowerCase().includes(val.toLowerCase()));
                  if (match) setSelectedCity(match);
                }
              }}
              placeholder="Search monitoring station..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-satoshi bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Range filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'good', label: 'Good' },
              { id: 'moderate', label: 'Mod' },
              { id: 'unhealthy', label: 'Poor' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAqiFilter(f.id)}
                className="text-[10px] font-bold font-satoshi uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
                style={{
                  background: aqiFilter === f.id ? 'var(--primary)' : 'var(--bg-secondary)',
                  color: aqiFilter === f.id ? 'white' : 'var(--text-secondary)',
                  borderColor: aqiFilter === f.id ? 'transparent' : 'var(--border)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <button 
              onClick={() => setMapMode('all')}
              className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-all ${mapMode === 'all' ? 'bg-white shadow-sm' : ''}`}
              style={{ color: mapMode === 'all' ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              All AQI Map
            </button>
            <button 
              onClick={() => setMapMode('uploaded')}
              className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-md transition-all ${mapMode === 'uploaded' ? 'bg-white shadow-sm' : ''}`}
              style={{ color: mapMode === 'uploaded' ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              Uploaded Places
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredCities.map((city) => (
            <div
              key={city.name}
              onClick={() => setSelectedCity(city)}
              className={`p-4 flex items-center justify-between cursor-pointer hover:bg-mint/45 transition-colors ${selectedCity?.name === city.name ? 'bg-mint' : ''}`}
            >
              <div className="flex items-center gap-2">
                <HiOutlineLocationMarker className="text-primary shrink-0" size={14} />
                <span className="text-xs font-semibold font-satoshi" style={{ color: 'var(--text)' }}>{city.name}</span>
              </div>
              <span
                className="text-xs font-bold font-number px-2.5 py-1 rounded-lg text-white"
                style={{ background: city.color || '#9E9E9E' }}
              >
                {city.aqi ?? 'N/A'}
              </span>
            </div>
          ))}
          {filteredCities.length === 0 && (
            <div className="p-8 text-center text-xs font-satoshi" style={{ color: 'var(--text-muted)' }}>
              No matches found
            </div>
          )}
        </div>

        {/* Legend Panel */}
        <div className="p-6 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>AQI Index Legend</h4>
          <div className="grid grid-cols-2 gap-2">
            {AQI_LEGEND.map((item) => (
              <div key={item.range} className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-white" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-[9px] font-bold font-satoshi" style={{ color: 'var(--text)' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAP CENTER: Interactive Leaflet Visualization ─── */}
      <div className="flex-1 h-full relative z-10">
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          className="w-full h-full"
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <ThemeTileLayer />
          <MapController center={getMapCenter()} zoom={getMapZoom()} />

          {finalCities.map((city, idx) => (
            city.aqi !== null && (
              <CircleMarker
                key={city.id || `${city.name}-${idx}`}
                center={[city.lat, city.lng]}
                radius={12}
                pathOptions={{
                  color: city.source === 'estimated' ? `${city.color}88` : city.color, // Slightly transparent border for estimated
                  fillColor: city.color,
                  fillOpacity: city.source === 'estimated' ? 0.4 : 0.7,
                  weight: city.source === 'estimated' ? 1.5 : 2.5,
                  dashArray: city.source === 'estimated' ? '4 4' : undefined,
                }}
                eventHandlers={{
                  click: () => setSelectedCity(city),
                }}
              >
                <Popup className="aqi-custom-popup">
                  <div className="p-2 min-w-[220px] font-satoshi">
                    <div className="font-bold text-sm mb-1 text-slate-900">{city.name}</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black font-number" style={{ color: city.color }}>
                        AQI {city.aqi}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                        style={{ background: city.color }}
                      >
                        {city.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <div><span className="text-slate-500">PM2.5:</span> <span className="font-semibold">{city.pollutants?.pm25 ?? 'N/A'}</span></div>
                      <div><span className="text-slate-500">PM10:</span> <span className="font-semibold">{city.pollutants?.pm10 ?? 'N/A'}</span></div>
                      <div><span className="text-slate-500">NO₂:</span> <span className="font-semibold">{city.pollutants?.no2 ?? 'N/A'}</span></div>
                      <div><span className="text-slate-500">SO₂:</span> <span className="font-semibold">{city.pollutants?.so2 ?? 'N/A'}</span></div>
                      <div><span className="text-slate-500">CO:</span> <span className="font-semibold">{city.pollutants?.co ?? 'N/A'}</span></div>
                      <div><span className="text-slate-500">O₃:</span> <span className="font-semibold">{city.pollutants?.o3 ?? 'N/A'}</span></div>
                    </div>

                    {city.source === 'estimated' && (
                      <div className="text-[11px] text-amber-600 font-semibold mb-1 bg-amber-50 p-1 rounded border border-amber-200 text-center">
                        Estimated from nearby stations
                      </div>
                    )}
                    
                    {city.id !== undefined && (stationReportsMap.get(city.id)?.length || 0) > 0 && (
                      <div className="text-[11px] text-primary font-bold mb-1 bg-mint/30 p-1 rounded border border-primary/20 text-center flex items-center justify-center gap-1">
                        <ImageIcon size={12} /> {(stationReportsMap.get(city.id)?.length || 0)} Community Report(s)
                      </div>
                    )}

                    {city.dominantPollutant && (
                      <div className="text-[11px] text-slate-600 mb-1">
                        Dominant: <strong className="uppercase text-slate-800">{city.dominantPollutant}</strong>
                      </div>
                    )}

                    {city.time && (
                      <div className="text-[10px] text-slate-400">
                        Updated: {new Date(city.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          ))}
        </MapContainer>

        {/* Floating Toggle indicator for Legend (mobile sizes) */}
        <div className="absolute bottom-6 left-6 z-30 lg:hidden glass-heavy p-3 rounded-xl border shadow-md" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold font-satoshi" style={{ color: 'var(--text)' }}>Active Monitors</span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT DRAWER: City AQI & Latest local reports ─── */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-full sm:w-[420px] h-full z-40 border-l flex flex-col justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-glass-heavy)', backdropFilter: 'blur(30px)' }}
          >
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Drawer Title Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black font-heading" style={{ color: 'var(--text)' }}>{selectedCity.name}</h3>
                  <span className="text-xs font-satoshi" style={{ color: 'var(--text-secondary)' }}>AQI City Details</span>
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="p-2 rounded-xl cursor-pointer hover:bg-mint transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ✕
                </button>
              </div>

              {/* AQI Level Panel */}
              <div className="glass-card p-6 rounded-2xl flex items-center justify-between" style={{ border: '1px solid var(--border)' }}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Air Quality Index</span>
                  <div className="text-5xl font-black font-number mt-1.5" style={{ color: selectedCity.color }}>
                    {selectedCity.aqi ?? 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Condition</span>
                  <div
                    className="text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg border mt-2"
                    style={{ background: selectedCity.color + '15', color: selectedCity.color, borderColor: selectedCity.color + '30' }}
                  >
                    {selectedCity.category}
                  </div>
                </div>
              </div>

              {/* Pollutant metrics */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Detailed Pollutants</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] text-secondary">PM2.5</div>
                    <div className="text-xs font-bold font-number mt-0.5">{selectedCity.pollutants?.pm25 ?? 'N/A'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] text-secondary">PM10</div>
                    <div className="text-xs font-bold font-number mt-0.5">{selectedCity.pollutants?.pm10 ?? 'N/A'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] text-secondary">NO₂</div>
                    <div className="text-xs font-bold font-number mt-0.5">{selectedCity.pollutants?.no2 ?? 'N/A'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] text-secondary">SO₂</div>
                    <div className="text-xs font-bold font-number mt-0.5">{selectedCity.pollutants?.so2 ?? 'N/A'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] text-secondary">CO</div>
                    <div className="text-xs font-bold font-number mt-0.5">{selectedCity.pollutants?.co ?? 'N/A'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] text-secondary">O₃</div>
                    <div className="text-xs font-bold font-number mt-0.5">{selectedCity.pollutants?.o3 ?? 'N/A'}</div>
                  </div>
                </div>
              </div>

              {selectedCity.dominantPollutant && (
                <div className="p-3 rounded-xl border flex justify-between items-center text-xs font-satoshi" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dominant Pollutant</span>
                  <span className="font-bold text-primary uppercase">{selectedCity.dominantPollutant}</span>
                </div>
              )}

              {selectedCity.time && (
                <div className="p-3 rounded-xl border flex justify-between items-center text-xs font-satoshi" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Updated</span>
                  <span className="font-semibold text-xs">{new Date(selectedCity.time).toLocaleString()}</span>
                </div>
              )}

              {/* Latest Uploaded Reports */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800" style={{ color: 'var(--text)' }}>
                  📸 Community Reports near {selectedCity.name}
                </h4>

                {loadingReports ? (
                  <div className="space-y-3">
                    <div className="skeleton h-20 w-full" />
                    <div className="skeleton h-20 w-full" />
                  </div>
                ) : cityReports.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed text-center text-xs font-satoshi" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    No reports filed for this city yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cityReports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => navigate(`/report/${r.id}`)}
                        className="glass-card p-3 rounded-xl flex gap-3 cursor-pointer hover:bg-mint/35 transition-all"
                      >
                        <img
                          src={r.imageUrl}
                          alt={r.title}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                        <div className="overflow-hidden flex flex-col justify-between">
                          <h5 className="font-bold text-xs line-clamp-2" style={{ color: 'var(--text)' }}>{r.title}</h5>
                          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-0.5"><HiOutlineCalendar /> {new Date(r.reportDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            <span>❤️ {r.likeCount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sighting Action */}
            <div className="p-6 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => navigate(`/upload?city=${selectedCity.name}`)}
                className="btn-gradient w-full py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl"
              >
                Upload Sighting in {selectedCity.name}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
