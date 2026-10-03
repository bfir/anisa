import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getToken, initializeSession, login } from "./apiClient";
import { useLocale } from "./localeContext";
import LanguageSelector from "./LanguageSelector";
import { Brand, Notice, PageHeading } from "./Ui";
import Inicio from "./Inicio";
import Asistente from "./Asistente";
import Mensajes from "./Mensajes";
import Pacientes from "./Pacientes";
import Citas from "./Citas";
import Pagos from "./Pagos";
import Informes from "./Informes";
import Ajustes from "./Ajustes";
import Auditoria from "./Auditoria";
import Layout from "./Layout";

function App() {
  const { t } = useLocale();
  const teamAccess = new URLSearchParams(window.location.search).get("acceso") === "equipo";
  const [session, setSession] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [startupError, setStartupError] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    initializeSession({ teamAccess })
      .then((result) => { if (active) setSession(result); })
      .catch(() => { if (active) setStartupError(true); });
    return () => { active = false; };
  }, [attempt, teamAccess]);

  async function manejarLogin(evento) {
    evento.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      window.history.replaceState({}, "", window.location.pathname);
      setSession({ ...session, demo: false, token: getToken() });
    } catch (err) {
      setError(err.status === 401 ? "invalidLogin" : "loginError");
    } finally {
      setLoading(false);
    }
  }

  if (!session?.token) return (
    <div className="login-shell">
      <section className="login-story">
        <Brand />
        <div><h1>{t("loginTitle")}</h1><p>{t("loginIntro")}</p></div>
        <p className="meta">{t("demoNote")}</p>
      </section>
      <div className="login-form-area">
        <div className="login-toolbar"><Brand /><LanguageSelector /></div>
        {!session ? (
          <section className="login-form" aria-busy={!startupError}>
            <h2>{t("openingWorkspace")}</h2>
            <p className="muted">{t("coldStart")}</p>
            {startupError ? (
              <div className="login-fields">
                <Notice>{t("loginError")}</Notice>
                <button type="button" className="button button-primary" onClick={() => {
                  setStartupError(false);
                  setAttempt((value) => value + 1);
                }}>{t("retry")}</button>
              </div>
            ) : <p role="status" className="meta mt-4">{t("connecting")}</p>}
          </section>
        ) : <form onSubmit={manejarLogin} className="login-form" aria-busy={loading}>
          <h2>{t("signIn")}</h2>
          <p className="muted">{t("signInIntro")}</p>
          <div className="login-fields">
            <div>
              <label className="field-label" htmlFor="login-email">{t("email")}</label>
              <input id="login-email" type="email" autoComplete="username" required dir="ltr"
                value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="login-password">{t("password")}</label>
              <input id="login-password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
            </div>
            {error && <Notice>{t(error)}</Notice>}
            <button type="submit" disabled={loading} className="button button-primary">
              {t(loading ? "signingIn" : "signIn")}<ArrowRight className="direction-arrow" size={16} aria-hidden="true" />
            </button>
            {loading && <p role="status" className="meta">{t("coldStart")}</p>}
          </div>
        </form>}
      </div>
    </div>
  );

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/citas" element={<Citas />} />
        <Route path="/mensajes" element={<Mensajes />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/informes" element={<Informes />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/ajustes" element={<Ajustes demo={session.demo} />} />
        <Route path="*" element={<><PageHeading title={t("notFound")} /><Link className="button button-primary" to="/">{t("goHome")}</Link></>} />
      </Routes>
    </Layout>
  );
}

export default App;
