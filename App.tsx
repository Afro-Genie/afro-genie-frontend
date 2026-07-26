import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import { WebPlaybackProvider } from './context/WebPlaybackContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TranslationPage from './pages/TranslationPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CommunityPage from './pages/CommunityPage';
import CommunityFeedPage from './pages/CommunityFeedPage';
import TopicDetailPage from './pages/TopicDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArtistsManager from './pages/admin/ArtistsManager';
import SongsManager from './pages/admin/SongsManager';
import GenresManager from './pages/admin/GenresManager';
import LanguagesManager from './pages/admin/LanguagesManager';
import CommunityManager from './pages/admin/CommunityManager';
import UsersManager from './pages/admin/UsersManager';
import UnifiedManager from './pages/admin/UnifiedManager';
import GenieManager from './pages/admin/GenieManager';
import SpotifyManager from './pages/admin/SpotifyManager';
import TranslationRequestsPage from './pages/admin/TranslationRequestsPage';
import RoleRequestsManager from './pages/admin/RoleRequestsManager';
import EditSongPage from './pages/admin/EditSongPage';
import AddSongPage from './pages/admin/AddSongPage';
import ArtistApplicationPage from './pages/ArtistApplicationPage';
import ModeratorRequestPage from './pages/ModeratorRequestPage';
import ArtistDetailPage from './pages/ArtistDetailPage';
import ArtistDashboardLayout from './components/artist/ArtistDashboardLayout';
import ArtistHomePage from './pages/artist/ArtistHomePage';
import ArtistMusicPage from './pages/artist/ArtistMusicPage';
import ArtistAnalyticsPage from './pages/artist/ArtistAnalyticsPage';
import ArtistProfileSettingsPage from './pages/artist/ArtistProfileSettingsPage';
import ArtistListenersPage from './pages/artist/ArtistListenersPage';
import ArtistSettingsPage from './pages/artist/ArtistSettingsPage';
import ArtistApplicationsManager from './pages/admin/ArtistApplicationsManager';
import ArtistsPage from './pages/ArtistsPage';
import SongsCatalogPage from './pages/SongsCatalogPage';
import GenreResultPage from './pages/GenreResultPage';
import LanguageResultPage from './pages/LanguageResultPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AccountPage from './pages/AccountPage';
import SpotifyLinkDialog from './components/SpotifyLinkDialog';
import NowPlayingBar from './components/NowPlayingBar';
import ScrollToTop from './components/ScrollToTop';
import PlaybackDiagnosticPanel from './components/PlaybackDiagnosticPanel';
import { featureFlags } from './config/featureFlags';

function App() {
  return (
    <AuthProvider>
      <WebPlaybackProvider>
        <AudioProvider>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </HashRouter>
        {featureFlags.playbackDiagnostics && <PlaybackDiagnosticPanel />}
        </AudioProvider>
      </WebPlaybackProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isArtistDashboard = location.pathname.startsWith('/artist');
  const isSongPlayback = /\/songs?\/[^/]+/.test(location.pathname);
  const isHomePage = location.pathname === '/';
  const showChrome = !isArtistDashboard && !isSongPlayback;

  return (
    <>
      <ScrollToTop />
      {showChrome && <Header />}
      <div className="text-white font-sans bg-[#122118] min-h-screen flex flex-col">
        <main className="flex-grow pb-16">
            <Routes>
              <Route path="/terms" element={<TermsOfUsePage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/song/:id" element={<TranslationPage />} />
              <Route path="/songs/:id" element={<TranslationPage />} />
              <Route path="/artists/:id" element={<ArtistDetailPage />} />
              <Route path="/songs" element={<SongsCatalogPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/search/:query" element={<SearchResultsPage />} />
              <Route path="/genre/:name" element={<GenreResultPage />} />
              <Route path="/language/:code" element={<LanguageResultPage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/request-translation" element={<Navigate to="/songs" replace />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/create" element={<CommunityPage />} />
              <Route path="/community/topic/:topicId" element={<TopicDetailPage />} />
              <Route path="/community/:categoryId" element={<CommunityFeedPage />} />
              <Route path="/apply/artist" element={<ArtistApplicationPage />} />
              <Route path="/apply/moderator" element={<ModeratorRequestPage />} />
              <Route
                path="/artist"
                element={
                  <ProtectedRoute requireArtist>
                    <ArtistDashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ArtistHomePage />} />
                <Route path="music" element={<ArtistMusicPage />} />
                <Route path="analytics" element={<ArtistAnalyticsPage />} />
                <Route path="listeners" element={<ArtistListenersPage />} />
                <Route path="profile" element={<ArtistProfileSettingsPage />} />
                <Route path="settings" element={<ArtistSettingsPage />} />
              </Route>
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
                <Route path="songs/add" element={<AddSongPage />} />
                <Route path="songs/edit/:id" element={<EditSongPage />} />
                <Route path="genres" element={<GenresManager />} />
                <Route path="languages" element={<LanguagesManager />} />
                <Route path="community" element={<CommunityManager />} />
                <Route path="users" element={<UsersManager />} />
                <Route path="role-requests" element={<RoleRequestsManager />} />
                <Route path="unified" element={<UnifiedManager />} />
                <Route path="genie" element={<GenieManager />} />
                <Route path="spotify" element={<SpotifyManager />} />
                <Route path="translation-requests" element={<TranslationRequestsPage />} />
                <Route path="artist-applications" element={<ArtistApplicationsManager />} />
              </Route>
            </Routes>
            <SpotifyLinkDialog />
            <NowPlayingBar />
          </main>
          {isHomePage && <Footer />}
          </div>
    </>
  );
}

export default App;