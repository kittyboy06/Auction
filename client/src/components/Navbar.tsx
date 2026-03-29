import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <nav className="nav-bar">
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <span className="nav-brand">BidLive</span>
            <div className="nav-links">
              <a className="nav-link active" href="#">Live</a>
              <a className="nav-link" href="#">Catalog</a>
              <a className="nav-link" href="#">Watchlist</a>
            </div>
          </div>
          <div className="nav-right">
            {isAuthenticated && (
              <>
                <div className="nav-wallet">
                  <span className="material-symbols-outlined nav-wallet-icon">account_balance_wallet</span>
                  <span className="nav-wallet-amount">$24,500.00</span>
                </div>
                <div className="nav-user" onClick={logout}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0052ff, #0038b6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-label)', fontSize: '0.8rem', fontWeight: 700, color: 'white'
                  }}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="nav-user-name">{user?.name || 'Profile'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="mobile-nav">
        <div className="mobile-nav-inner">
          <div className="mobile-nav-item active">
            <span className="material-symbols-outlined filled">sensors</span>
            <span>Live</span>
          </div>
          <div className="mobile-nav-item">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Catalog</span>
          </div>
          <div className="mobile-nav-item">
            <span className="material-symbols-outlined">grade</span>
            <span>Watchlist</span>
          </div>
          <div className="mobile-nav-item">
            <span className="material-symbols-outlined">gavel</span>
            <span>Bids</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
