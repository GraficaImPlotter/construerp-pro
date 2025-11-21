import { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken } from "./supabase";

interface AuthUser {
  id: string;
  nick: string;
  role: string;
  full_name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Carregar token e usuário armazenado
  useEffect(() => {
    const savedUser = localStorage.getItem("erp_user");
    const savedToken = localStorage.getItem("erp_token");

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      setAuthToken(savedToken);
    }
  }, []);

  const login = async (user: AuthUser, token: string) => {
    localStorage.setItem("erp_user", JSON.stringify(user));
    localStorage.setItem("erp_token", token);

    setUser(user);
    setToken(token);

    setAuthToken(token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("erp_user");
    localStorage.removeItem("erp_token");
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
