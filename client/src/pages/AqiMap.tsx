import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { aqiApi, wqiApi, reportsApi } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import type { AqiCity, WqiStation, Report } from '@/types';
import { HiOutlineLocationMarker, HiOutlineCalendar } from 'react-icons/hi';
import { Search, Image as ImageIcon, Droplets, Wind, ShieldAlert } from 'lucide-react';

const INDIA_CENTER: [number, number] = [22.5, 79.0];
const INDIA_ZOOM = 5;

const AQI_LEGEND = [
  { range: '0–50', label: 'Good', color: '#2E7D32' },
  { range: '51–100', label: 'Moderate', color: '#D4A373' },
  { range: '101–150', label: 'Sensitive', color: '#F97316' },
  { range: '151–200', label: 'Unhealthy', color: '#EF4444' },
  { range: '201–300', label: 'Very Unhealthy', color: '#9C27B0' },
  { range: '300+', label: 'Hazardous', color: '#7B1FA2' },
];

const WQI_LEGEND = [
  { range: '0–25', label: 'Excellent', color: '#00B050' },
  { range: '26–50', label: 'Good', color: '#0284C7' },
  { range: '51–75', label: 'Moderate', color: '#F97316' },
  { range: '76–100', label: 'Poor', color: '#EF4444' },
  { range: '100+', label: 'Severe', color: '#7B1FA2' },
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
  const [domainMode, setDomainMode] = useState<'AIR' | 'WATER'>('AIR');
  const [cities, setCities] = useState<AqiCity[]>([]);
  const [wqiStations, setWqiStations] = useState<WqiStation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState<AqiCity | null>(null);
  const [selectedWqiStation, setSelectedWqiStation] = useState<WqiStation | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [aqiFilter, setAqiFilter] = useState('all');
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [stationReportsMap, setStationReportsMap] = useState<Map<number | string, Report[]>>(new Map());

  // Right drawer reports list
  const [cityReports, setCityReports] = useState<Report[]>([]);

  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Load cities (AQI) from API
  useEffect(() => {
    (async () => {
      try {
        const data = await aqiApi.getCities();
        const combined = [...(data.realStations || []), ...(data.estimatedStations || [])];
        setCities(combined);

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

  // Load WQI stations from API
  useEffect(() => {
    (async () => {
      try {
        const res = await wqiApi.getStations();
        setWqiStations(res.stations || []);
      } catch (err: any) {
        console.error('Failed to load WQI stations', err);
      }
    })();
  }, []);

  // Calculate distance
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

  // Compute stationReportsMap for AQI
  useEffect(() => {
    if (cities.length === 0 || allReports.length === 0) return;
    const newMap = new Map<number | string, Report[]>();
    allReports.forEach((report) => {
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

  // Filtering for AQI cities
  const filteredCities = cities.filter((city) => {
    const matchesSearch = city.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (aqiFilter === 'all') return matchesSearch;
    if (aqiFilter === 'good') return matchesSearch && (city.aqi ?? 0) <= 50;
    if (aqiFilter === 'moderate') return matchesSearch && (city.aqi ?? 0) > 50 && (city.aqi ?? 0) <= 100;
    if (aqiFilter === 'unhealthy') return matchesSearch && (city.aqi ?? 0) > 100;
    return matchesSearch;
  });

  // Filtering for WQI stations
  const filteredWqiStations = wqiStations.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.waterBody.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.city.toLowerCase().includes(searchQuery.toLowerCase());
    if (aqiFilter === 'all') return matchesSearch;
    if (aqiFilter === 'good') return matchesSearch && (st.wqi ?? 0) <= 50;
    if (aqiFilter === 'moderate') return matchesSearch && (st.wqi ?? 0) > 50 && (st.wqi ?? 0) <= 75;
    if (aqiFilter === 'unhealthy') return matchesSearch && (st.wqi ?? 0) > 75;
    return matchesSearch;
  });

  const getMapCenter = (): [number, number] => {
    if (domainMode === 'AIR' && selectedCity) return [selectedCity.lat, selectedCity.lng];
    if (domainMode === 'WATER' && selectedWqiStation) return [selectedWqiStation.lat, selectedWqiStation.lng];
    return INDIA_CENTER;
  };

  const getMapZoom = (): number => {
    if (domainMode === 'AIR' && selectedCity) return 9;
    if (domainMode === 'WATER' && selectedWqiStation) return 10;
    return INDIA_ZOOM;
  };

  return (
    <div className="flex relative overflow-hidden" style={{ height: 'calc(100vh - 5rem)', marginTop: '5rem' }}>

      {/* ─── LEFT SIDEBAR: Domain Switcher, Search, Filters, & Legend ─── */}
      <div
        className="w-80 h-full hidden lg:flex flex-col border-r shrink-0 z-30 overflow-y-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-glass-heavy)', backdropFilter: 'blur(20px)' }}
      >
        <div className="p-5 border-b space-y-3.5" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>
              Environment Monitor
            </h1>
            <p className="text-xs font-satoshi" style={{ color: 'var(--text-secondary)' }}>
              Real-time Air & Water Quality across India
            </p>
          </div>

          {/* Domain Mode Toggle Switch */}
          <div className="flex p-1 rounded-xl border bg-slate-100/90" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => {
                setDomainMode('AIR');
                setSelectedWqiStation(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                domainMode === 'AIR'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wind size={14} /> Air (AQI)
            </button>
            <button
              onClick={() => {
                setDomainMode('WATER');
                setSelectedCity(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                domainMode === 'WATER'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets size={14} /> Water (WQI)
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={domainMode === 'AIR' ? 'Search AQI station...' : 'Search river/lake station...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-satoshi bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Filter pills */}
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
                  background: aqiFilter === f.id ? (domainMode === 'AIR' ? 'var(--primary)' : '#0284C7') : 'var(--bg-secondary)',
                  color: aqiFilter === f.id ? 'white' : 'var(--text-secondary)',
                  borderColor: aqiFilter === f.id ? 'transparent' : 'var(--border)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Stations (AQI or WQI) */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {domainMode === 'AIR' ? (
            filteredCities.map((city) => (
              <div
                key={city.name}
                onClick={() => setSelectedCity(city)}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-mint/45 transition-colors ${
                  selectedCity?.name === city.name ? 'bg-mint' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <HiOutlineLocationMarker className="text-primary shrink-0" size={14} />
                  <span className="text-xs font-semibold font-satoshi" style={{ color: 'var(--text)' }}>
                    {city.name}
                  </span>
                </div>
                <span
                  className="text-xs font-bold font-number px-2.5 py-1 rounded-lg text-white"
                  style={{ background: city.color || '#9E9E9E' }}
                >
                  AQI {city.aqi ?? 'N/A'}
                </span>
              </div>
            ))
          ) : (
            filteredWqiStations.map((st) => (
              <div
                key={st.id}
                onClick={() => setSelectedWqiStation(st)}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-sky-50 transition-colors ${
                  selectedWqiStation?.id === st.id ? 'bg-sky-100/70' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <Droplets className="text-sky-600 shrink-0" size={13} />
                    <span className="text-xs font-bold font-satoshi" style={{ color: 'var(--text)' }}>
                      {st.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block ml-5">
                    {st.waterBody} • {st.city}
                  </span>
                </div>
                <span
                  className="text-xs font-bold font-number px-2.5 py-1 rounded-lg text-white"
                  style={{ background: st.color }}
                >
                  WQI {st.wqi}
                </span>
              </div>
            ))
          )}

          {((domainMode === 'AIR' && filteredCities.length === 0) ||
            (domainMode === 'WATER' && filteredWqiStations.length === 0)) && (
            <div className="p-8 text-center text-xs font-satoshi" style={{ color: 'var(--text-muted)' }}>
              No station matches found
            </div>
          )}
        </div>

        {/* Legend Panel */}
        <div className="p-5 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            {domainMode === 'AIR' ? 'AQI Legend (Air Quality)' : 'WQI Legend (Water Quality)'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {(domainMode === 'AIR' ? AQI_LEGEND : WQI_LEGEND).map((item) => (
              <div key={item.range} className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-white" style={{ borderColor: 'var(--border)' }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-[9px] font-bold font-satoshi" style={{ color: 'var(--text)' }}>
                  {item.label} ({item.range})
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

          {/* Render AQI Circle Markers */}
          {domainMode === 'AIR' &&
            filteredCities.map(
              (city, idx) =>
                city.aqi !== null && (
                  <CircleMarker
                    key={city.id || `${city.name}-${idx}`}
                    center={[city.lat, city.lng]}
                    radius={12}
                    pathOptions={{
                      color: city.source === 'estimated' ? `${city.color}88` : city.color,
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
                        <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-2 rounded border mb-2">
                          <div><span className="text-slate-500">PM2.5:</span> {city.pollutants?.pm25 ?? 'N/A'}</div>
                          <div><span className="text-slate-500">PM10:</span> {city.pollutants?.pm10 ?? 'N/A'}</div>
                          <div><span className="text-slate-500">NO₂:</span> {city.pollutants?.no2 ?? 'N/A'}</div>
                          <div><span className="text-slate-500">SO₂:</span> {city.pollutants?.so2 ?? 'N/A'}</div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
            )}

          {/* Render WQI Water Station Markers */}
          {domainMode === 'WATER' &&
            filteredWqiStations.map((st) => (
              <CircleMarker
                key={st.id}
                center={[st.lat, st.lng]}
                radius={14}
                pathOptions={{
                  color: '#0284C7',
                  fillColor: st.color,
                  fillOpacity: 0.85,
                  weight: 3,
                }}
                eventHandlers={{
                  click: () => setSelectedWqiStation(st),
                }}
              >
                <Popup className="aqi-custom-popup">
                  <div className="p-2 min-w-[240px] font-satoshi">
                    <div className="font-bold text-sm text-slate-900">{st.name}</div>
                    <div className="text-[11px] text-sky-700 font-semibold mb-1.5">
                      💧 {st.waterBody} ({st.city})
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black font-number" style={{ color: st.color }}>
                        WQI {st.wqi}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                        style={{ background: st.color }}
                      >
                        {st.category}
                      </span>
                    </div>

                    <div className="text-[11px] p-2 rounded bg-sky-50 border border-sky-200 text-sky-950 mb-2 font-medium">
                      {st.suitability}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-2 rounded border">
                      <div>pH: <strong>{st.parameters.ph}</strong></div>
                      <div>TDS: <strong>{st.parameters.tds} mg/L</strong></div>
                      <div>Turbidity: <strong>{st.parameters.turbidity} NTU</strong></div>
                      <div>D.O.: <strong>{st.parameters.do} mg/L</strong></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>

      {/* ─── RIGHT DRAWER: AQI or WQI Details ─── */}
      <AnimatePresence>
        {selectedCity && domainMode === 'AIR' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-full sm:w-[420px] h-full z-40 border-l flex flex-col justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-glass-heavy)', backdropFilter: 'blur(30px)' }}
          >
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black font-heading" style={{ color: 'var(--text)' }}>
                    {selectedCity.name}
                  </h3>
                  <span className="text-xs font-satoshi text-emerald-600 font-bold">🌬️ Air Quality Index (AQI)</span>
                </div>
                <button onClick={() => setSelectedCity(null)} className="p-2 rounded-xl hover:bg-mint">
                  ✕
                </button>
              </div>

              <div className="glass-card p-6 rounded-2xl flex items-center justify-between border">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Air Quality Index</span>
                  <div className="text-5xl font-black font-number mt-1.5" style={{ color: selectedCity.color }}>
                    {selectedCity.aqi ?? 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase px-3 py-1 rounded-lg text-white" style={{ background: selectedCity.color }}>
                    {selectedCity.category}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl border text-center bg-slate-50">
                  <div className="text-[10px] text-slate-500">PM2.5</div>
                  <div className="text-xs font-bold">{selectedCity.pollutants?.pm25 ?? 'N/A'}</div>
                </div>
                <div className="p-2.5 rounded-xl border text-center bg-slate-50">
                  <div className="text-[10px] text-slate-500">PM10</div>
                  <div className="text-xs font-bold">{selectedCity.pollutants?.pm10 ?? 'N/A'}</div>
                </div>
                <div className="p-2.5 rounded-xl border text-center bg-slate-50">
                  <div className="text-[10px] text-slate-500">NO₂</div>
                  <div className="text-xs font-bold">{selectedCity.pollutants?.no2 ?? 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => navigate(`/upload?city=${selectedCity.name}`)}
                className="btn-gradient w-full py-4 text-xs font-bold uppercase rounded-xl"
              >
                Upload Air Sighting in {selectedCity.name}
              </button>
            </div>
          </motion.div>
        )}

        {/* WQI Selected Drawer */}
        {selectedWqiStation && domainMode === 'WATER' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-full sm:w-[420px] h-full z-40 border-l flex flex-col justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-glass-heavy)', backdropFilter: 'blur(30px)' }}
          >
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black font-heading" style={{ color: 'var(--text)' }}>
                    {selectedWqiStation.name}
                  </h3>
                  <span className="text-xs font-bold text-sky-600 flex items-center gap-1 mt-0.5">
                    <Droplets size={13} /> {selectedWqiStation.waterBody} • {selectedWqiStation.city}
                  </span>
                </div>
                <button onClick={() => setSelectedWqiStation(null)} className="p-2 rounded-xl hover:bg-sky-100">
                  ✕
                </button>
              </div>

              {/* WQI Score Panel */}
              <div className="p-6 rounded-2xl flex items-center justify-between border bg-white shadow-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Water Quality Index (WQI)</span>
                  <div className="text-5xl font-black font-number mt-1" style={{ color: selectedWqiStation.color }}>
                    {selectedWqiStation.wqi}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase px-3 py-1.5 rounded-lg text-white" style={{ background: selectedWqiStation.color }}>
                    {selectedWqiStation.category}
                  </span>
                </div>
              </div>

              {/* Health & Drinking Suitability Alert */}
              <div className="p-4 rounded-xl border bg-amber-50/80 border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <ShieldAlert size={15} /> Health & Drinking Advisory
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {selectedWqiStation.healthAdvisory}
                </p>
                <div className="text-[11px] font-semibold text-amber-950 mt-1 pt-1 border-t border-amber-200">
                  Status: <strong>{selectedWqiStation.suitability}</strong>
                </div>
              </div>

              {/* Key Water Parameters */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tested Water Parameters</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-satoshi">
                  <div className="p-3 rounded-xl border bg-slate-50 flex justify-between">
                    <span className="text-slate-500">pH Level</span>
                    <strong className="text-slate-900">{selectedWqiStation.parameters.ph}</strong>
                  </div>
                  <div className="p-3 rounded-xl border bg-slate-50 flex justify-between">
                    <span className="text-slate-500">TDS</span>
                    <strong className="text-slate-900">{selectedWqiStation.parameters.tds} mg/L</strong>
                  </div>
                  <div className="p-3 rounded-xl border bg-slate-50 flex justify-between">
                    <span className="text-slate-500">Turbidity</span>
                    <strong className="text-slate-900">{selectedWqiStation.parameters.turbidity} NTU</strong>
                  </div>
                  <div className="p-3 rounded-xl border bg-slate-50 flex justify-between">
                    <span className="text-slate-500">Dissolved O₂</span>
                    <strong className="text-slate-900">{selectedWqiStation.parameters.do} mg/L</strong>
                  </div>
                  <div className="p-3 rounded-xl border bg-slate-50 flex justify-between col-span-2">
                    <span className="text-slate-500">BOD (Biochemical Oxygen Demand)</span>
                    <strong className="text-slate-900">{selectedWqiStation.parameters.bod} mg/L</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50">
              <button
                onClick={() => navigate(`/upload?city=${selectedWqiStation.city}&category=WATER_POLLUTION`)}
                className="w-full py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl text-white bg-sky-600 hover:bg-sky-700 transition-all shadow-md"
              >
                <Droplets size={16} /> Upload Water Sighting in {selectedWqiStation.city}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
