import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import CommunityFeedPage from './pages/CommunityFeedPage';
import CommunityPage from './pages/CommunityPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchResultsPage from './pages/SearchResultsPage';
import SongsCatalogPage from './pages/SongsCatalogPage';
import TopicDetailPage from './pages/TopicDetailPage';
import TranslationPage from './pages/TranslationPage';
import StatusDashboard from './pages/admin/StatusDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/songs" element={<SongsCatalogPage />} />
            <Route path="/songs/:id" element={<TranslationPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/status" element={<StatusDashboard />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/:categoryId" element={<CommunityFeedPage />} />
            <Route path="/community/topic/:topicId" element={<TopicDetailPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
