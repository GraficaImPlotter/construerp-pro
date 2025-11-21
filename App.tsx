import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./services/authContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Works from "./pages/Works";
import Customers from "./pages/Customers";
import Finance from "./pages/Finance";
import Purchases from "./pages/Purchases";
import Fiscal from "./pages/Fiscal";
import Users from "./pages/Users";
import Profile from "./pages/Profile";

import Sidebar from "./components/Sidebar";

function ProtectedRoute({ children }: any) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 p-6 bg-gray-50">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/works" element={<Works />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/finance" element={<Finance />} />
                      <Route path="/purchases" element={<Purchases />} />
                      <Route path="/fiscal" element={<Fiscal />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
