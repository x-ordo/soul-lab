import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoadingPage from './pages/LoadingPage';
import ResultPage from './pages/ResultPage';
import DetailPage from './pages/DetailPage';
import ChemistryPage from './pages/ChemistryPage';
import AgreementPage from './pages/AgreementPage';
import NotFoundPage from './pages/NotFoundPage';
import DebugPage from './pages/DebugPage';
import TarotPage from './pages/TarotPage';

import { captureAttributionFromUrl } from './lib/attribution';
import { updateStreak } from './lib/streak';
import { getAttribution } from './lib/attribution';
import { track } from './lib/analytics';


function Bootstrap() {
  const loc = useLocation();

  useEffect(() => {
    // attribution & retention: on every navigation, but cheap
    captureAttributionFromUrl(loc.search, loc.pathname);
    const s = updateStreak();
    const at = getAttribution();
    track('page_view', { path: loc.pathname, search: loc.search, entryType: at?.entryType, variant: at?.variant, referrerId: at?.referrerId, streak: s });
  }, [loc.key, loc.pathname, loc.search]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/agreement" element={<AgreementPage />} />
      <Route path="/loading" element={<LoadingPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/detail" element={<DetailPage />} />
      <Route path="/chemistry" element={<ChemistryPage />} />
      <Route path="/tarot" element={<TarotPage />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Bootstrap />
    </BrowserRouter>
  );
}
