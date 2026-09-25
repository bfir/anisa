import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { getToken, login, logout } from "./apiClient";
import Inicio from "./Inicio";
import Asistente from "./Asistente";
import Mensajes from "./Mensajes";
import Layout from "./Layout";

function PaginaProvisional({ titulo }) {
  return <p className="text-ink-soft">Página "{titulo}" — próximamente.</p>;
}

function App() {
  const [token, setToken] = useState(getToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function manejarLogin(evento) {
    evento.preventDefault();
    setError("");
    try {
      await login(email, password);
      setToken(getToken());
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <form
          onSubmit={manejarLogin}
          className="bg-surface p-8 rounded-2xl border border-hairline w-full max-w-sm space-y-4"
        >
          <h1 className="font-display text-2xl">Anisa</h1>
          <p className="text-ink-soft text-sm">
            Panel del equipo de Atención al Paciente Internacional
          </p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-hairline rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-hairline rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {error && <p className="text-red-ink text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-accent text-white rounded-lg py-2 font-medium hover:opacity-90 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/pacientes" element={<PaginaProvisional titulo="Pacientes" />} />
        <Route path="/citas" element={<PaginaProvisional titulo="Citas" />} />
        <Route path="/mensajes" element={<Mensajes />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route path="/pagos" element={<PaginaProvisional titulo="Pagos" />} />
        <Route path="/informes" element={<PaginaProvisional titulo="Informes" />} />
        <Route path="/ajustes" element={<PaginaProvisional titulo="Ajustes" />} />
      </Routes>
    </Layout>
  );
}

export default App;
