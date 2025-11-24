import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import TranslationPage from './pages/TranslationPage';
import SearchResultsPage from './pages/SearchResultsPage';
import RequestTranslationPage from './pages/RequestTranslationPage';
import CommunityPage from './pages/CommunityPage';
import TopicDetail from './components/community/TopicDetail';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArtistsManager from './pages/admin/ArtistsManager';
import SongsManager from './pages/admin/SongsManager';
import GenresManager from './pages/admin/GenresManager';
import CommunityManager from './pages/admin/CommunityManager';
import UsersManager from './pages/admin/UsersManager';
import UnifiedManager from './pages/admin/UnifiedManager';
import GenieManager from './pages/admin/GenieManager';
import LyricImporter from './pages/admin/LyricImporter';
import LyricsManager from './pages/admin/LyricsManager';
import SpotifyManager from './pages/admin/SpotifyManager';
import ArtistSignupPage from './pages/ArtistSignupPage';
import ArtistDashboard from './pages/ArtistDashboard';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="text-white font-sans bg-[#122118] min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/song/:id" element={<TranslationPage />} />
            <Route path="/search/:query" element={<SearchResultsPage />} />
            <Route path="/request-translation" element={<RequestTranslationPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/create" element={<CommunityPage />} />
            <Route path="/community/topic/:topicId" element={<TopicDetail />} />
            <Route path="/artist/signup" element={<ArtistSignupPage />} />
            <Route
              path="/artist/dashboard"
              element={
                <ProtectedRoute requireArtist>
                  <ArtistDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
                  <Route index element={<AdminDashboard />} />
                  <Route path="artists" element={<ArtistsManager />} />
                  <Route path="songs" element={<SongsManager />} />
                  <Route path="genres" element={<GenresManager />} />
                  <Route path="community" element={<CommunityManager />} />
                  <Route path="users" element={<UsersManager />} />
                  <Route path="unified" element={<UnifiedManager />} />
                  <Route path="genie" element={<GenieManager />} />
                  <Route path="lyrics" element={<LyricsManager />} />
                  <Route path="lyric-importer" element={<LyricImporter />} />
                  <Route path="spotify" element={<SpotifyManager />} />
            </Route>
          </Routes>
          </main>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;