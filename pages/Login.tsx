import { useState } from "react";
import { useAuth } from "../services/authContext";
import { invokeEdgeFunction } from "../services/supabase";

export default function Login() {
  const { login } = useAuth();
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await invokeEdgeFunction("auth-login", {
        nick,
        password,
      });

      await login(result.user, result.token);

    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao fazer login");
      console.error("Login error:", err);
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">ConstruERP Pro</h1>

        {errorMsg && (
          <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        <input
          type="text"
          placeholder="Usuário"
          className="w-full mb-3 p-2 border rounded"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
