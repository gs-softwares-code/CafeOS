import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicSite } from './pages/PublicSite.js';
import { PosPage } from './pages/PosPage.js';
import { KdsPage } from './pages/KdsPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { TrackOrderPage } from './pages/TrackOrderPage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/order" element={<PosPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/kds" element={<KdsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/track/:trackingToken" element={<TrackOrderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

