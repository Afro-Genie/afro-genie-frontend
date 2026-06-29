import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">
          Afro Genie
        </Link>

        <SearchBar />

        <div className="row" style={{ justifySelf: 'end' }}>
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="btn">
                Login
              </Link>
              <Link to="/register" className="btn primary">
                Register
              </Link>
            </>
          ) : (
            <>
              <span className="muted">{user?.displayName}</span>
              {user?.role === 'ADMIN' && (
                <Link to="/admin/status" className="btn">
                  Admin
                </Link>
              )}
              <button
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
