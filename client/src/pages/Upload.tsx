import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlinePhotograph, HiOutlineX, HiOutlineCheckCircle } from 'react-icons/hi';
import { reportsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CATEGORY_LABELS } from '@/types';
import type { Category } from '@/types';
import { Search, MapPin, Upload as UploadIcon, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { GeoapifyGeocoderAutocomplete, GeoapifyContext } from '@geoapify/react-geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function Upload() {
  const { isAuthenticated, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="glass-card p-12 text-center max-w-md mx-4 rounded-3xl">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold font-heading mb-3" style={{ color: 'var(--text)' }}>Sign In Required</h2>
          <p className="mb-6 font-satoshi text-sm" style={{ color: 'var(--text-secondary)' }}>Please sign in to upload pollution reports.</p>
          <button onClick={() => navigate('/')} className="btn-gradient w-full py-3.5">Go to Login</button>
        </div>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addToast('error', 'Only JPG, JPEG, PNG, and WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addToast('error', 'Image exceeds 10 MB limit.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      const dt = new DataTransfer();
      dt.items.add(file);
      if (input) {
        input.files = dt.files;
        handleImageSelect({ target: { files: dt.files } } as any);
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !category || !city || !area) {
      addToast('error', 'Please fill all required fields and add an image.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('reportDate', reportDate);
      formData.append('city', city);
      formData.append('area', area);
      if (lat !== null) formData.append('lat', lat.toString());
      if (lng !== null) formData.append('lng', lng.toString());
      if (authorName) formData.append('authorName', authorName);

      await reportsApi.create(formData);
      setSuccess(true);
      addToast('success', '🎉 Report uploaded! +10 coins earned!');
      await refreshUser();
      setTimeout(() => navigate('/feed'), 2200);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to upload report');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-12 text-center max-w-md mx-4 rounded-3xl"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
            className="text-6xl mb-4"
          >
            <HiOutlineCheckCircle size={80} style={{ color: 'var(--primary)' }} className="mx-auto" />
          </motion.div>
          <h2 className="text-2xl font-bold font-heading mb-3" style={{ color: 'var(--text)' }}>Report Uploaded!</h2>
          <p className="mb-2 font-satoshi text-sm" style={{ color: 'var(--text-secondary)' }}>Thank you for your contribution.</p>
          <p className="text-lg font-bold font-heading" style={{ color: 'var(--primary)' }}>🪙 +10 Coins Earned!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        
        {/* Header Title */}
        <div className="mb-10 text-center max-w-lg mx-auto">
          <h1 className="text-4xl font-extrabold font-heading tracking-tight" style={{ color: 'var(--text)' }}>
            Upload Pollution Sighting
          </h1>
          <p className="text-sm font-satoshi mt-2" style={{ color: 'var(--text-secondary)' }}>
            Empower your community with visual evidence. Earn 10 coins for each contribution.
          </p>
        </div>

        {/* Form + Preview Grid container */}
        <div className="glass-card p-6 md:p-10 rounded-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            
            {/* Desktop Left / Mobile Top: Drag & Drop Dropzone Live Preview */}
            <div className="space-y-4">
              <label className="block text-xs font-bold font-satoshi uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Sighting Photograph
              </label>

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-dashed" style={{ borderColor: 'var(--border)' }}>
                  <img src={imagePreview} alt="Live pollution sighting preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-white cursor-pointer transition-colors"
                  >
                    <HiOutlineX size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${isDragOver ? 'border-primary bg-mint/30' : 'border-border bg-secondary/10'}`}
                  style={{ borderColor: isDragOver ? 'var(--primary)' : 'var(--border)' }}
                >
                  <HiOutlinePhotograph size={40} className="mb-4" style={{ color: 'var(--primary)' }} />
                  <span className="text-sm font-bold font-satoshi mb-1" style={{ color: 'var(--text)' }}>
                    Drag & drop your sighting image
                  </span>
                  <span className="text-xs font-satoshi mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Supports JPG, PNG or WEBP (Max 10MB)
                  </span>
                  <button
                    type="button"
                    className="btn-outline px-5 py-2.5 text-xs font-bold font-satoshi rounded-xl"
                  >
                    Browse Files
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept={ALLOWED_TYPES.join(',')}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Desktop Right / Mobile Bottom: Input Form Details */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garbage combustion in Juhu beach colony"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field py-3 text-sm font-satoshi"
                  maxLength={80}
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Detailed Description *
                </label>
                <textarea
                  required
                  placeholder="Explain what is happening. What is the impact? Include landmark details."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input-field py-3 text-sm font-satoshi resize-none"
                  maxLength={5000}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="input-field text-sm py-2.5 font-satoshi"
                  >
                    <option value="">Select Category</option>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Sighting Date *
                  </label>
                  <input
                    type="date"
                    required
                    max={today}
                    min={thirtyDaysAgo}
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="input-field text-sm py-2.5 font-satoshi"
                  />
                </div>
              </div>

              <GeoapifyContext apiKey={import.meta.env.VITE_LOCATION_KEY || "6dc7fb95a3b246cfa0f3bcef5ce9ed9a"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                      City *
                    </label>
                    <div className="geoapify-wrapper">
                      <GeoapifyGeocoderAutocomplete
                        placeholder="Search Indian city (e.g. Mumbai, Bengaluru)..."
                        type="city"
                        filterByCountryCode={['in']}
                        value={city}
                        placeSelect={(value) => {
                          if (value && value.properties) {
                            if (value.properties.country_code && value.properties.country_code.toLowerCase() !== 'in') {
                              addToast('error', 'Only Indian places allowed');
                              setCity('');
                              setLat(null);
                              setLng(null);
                              return;
                            }
                            setCity(value.properties.city || value.properties.name || '');
                            if (value.properties.lat && value.properties.lon) {
                              setLat(value.properties.lat);
                              setLng(value.properties.lon);
                            }
                          } else {
                            setCity('');
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Area / Suburb *
                    </label>
                    <div className="geoapify-wrapper">
                      <GeoapifyGeocoderAutocomplete
                        placeholder={city ? `Search area in ${city}...` : "Search area (e.g. Bandra West)..."}
                        type="street"
                        filterByCountryCode={['in']}
                        value={area}
                        placeSelect={(value) => {
                          if (value && value.properties) {
                            if (value.properties.country_code && value.properties.country_code.toLowerCase() !== 'in') {
                              addToast('error', 'Only Indian places allowed');
                              setArea('');
                              setLat(null);
                              setLng(null);
                              return;
                            }
                            setArea(value.properties.street || value.properties.name || '');
                            if (value.properties.city && !city) {
                              setCity(value.properties.city);
                            }
                            if (value.properties.lat && value.properties.lon) {
                              setLat(value.properties.lat);
                              setLng(value.properties.lon);
                            }
                          } else {
                            setArea('');
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </GeoapifyContext>

              <div className="relative">
                <label className="block text-xs font-bold font-satoshi uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Anonymous"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="input-field text-sm py-2.5 font-satoshi"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gradient w-full py-4 text-xs font-bold uppercase tracking-wider rounded-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Submitting Sighting...' : 'Publish Sighting Report'}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
