import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Settings, UploadCloud } from 'lucide-react';
import ImportHub from './pages/ImportHub';
import ConfigLibrary from './pages/ConfigLibrary';
import SkuPortfolio from './pages/SkuPortfolio';
import Dashboard from './pages/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

// Layout Component
const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1><Package size={24} /> SKU Selector</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Package size={20} /> SKU Portfolio
          </NavLink>
          <NavLink to="/config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} /> Configuration
          </NavLink>
          <NavLink to="/import" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UploadCloud size={20} /> Import Hub
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Logged in as <strong>{user?.username}</strong>
          </div>
          <button onClick={logout} className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};



// Settings and Config now handled by ConfigLibrary component

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="portfolio" element={<SkuPortfolio />} />
              <Route path="config" element={<ConfigLibrary />} />
              <Route path="import" element={<ImportHub />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
