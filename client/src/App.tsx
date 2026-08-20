import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import Navbar from '@/components/layout/Navbar';
import ToastContainer from '@/components/ui/ToastContainer';
import Landing from '@/pages/Landing';
import Feed from '@/pages/Feed';
import ReportDetail from '@/pages/ReportDetail';
import Upload from '@/pages/Upload';
import AqiMap from '@/pages/AqiMap';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/admin/AdminPanel';
import SmokeBackground from '@/components/effects/SmokeBackground';
import CustomCursor from '@/components/effects/CustomCursor';
import MadeByPage from '@/pages/MadeByPage';

function AppLayout() {
  return (
    <div className="relative flex flex-col min-h-screen">
      <SmokeBackground />
      <Navbar />
      <main className="relative z-10 flex-grow pt-24">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/report/:id" element={<ReportDetail />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/map" element={<AqiMap />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AnimatePresence>
      </main>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CustomCursor />
            <Routes>
              <Route path="/admin/*" element={<AdminPanel />} />
              <Route path="/madeby" element={<MadeByPage />} />
              <Route path="*" element={<AppLayout />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
