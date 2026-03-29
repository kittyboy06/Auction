import React, { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../services/api';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('BUYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await apiLogin(email, password);
        login(res.data.token, res.data.user);
      } else {
        await apiRegister(name, email, password, role);
        // Auto-login after registration
        const loginRes = await apiLogin(email, password);
        login(loginRes.data.token, loginRes.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel-solid animate-fade-in">
        <h1 className="auth-title">
          {isLogin ? 'Welcome Back' : 'Join BidLive'}
        </h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Sign in to access live auctions'
            : 'Create your account to start bidding'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-input-group">
              <label className="auth-label">Full Name</label>
              <input
                id="auth-name"
                className="auth-input"
                type="text"
                placeholder="Bruce Wayne"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              placeholder="bruce@wayne.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <label className="auth-label">Account Type</label>
              <select
                id="auth-role"
                className="role-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="BUYER">Buyer — I want to bid</option>
                <option value="SELLER">Seller — I want to list items</option>
              </select>
            </div>
          )}

          <button
            id="auth-submit"
            className="auth-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
