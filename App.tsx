
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/authContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fiscal from './pages/Fiscal';
import Works from './pages/Works';
import Finance from './pages/Finance';
import Purchases from './pages/Purchases';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Profile from './pages/Profile';

// Protected Layout Component
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/works" element={<Works />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/fiscal" element={<Fiscal />} />
            <Route path="/users" element={<Users />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;