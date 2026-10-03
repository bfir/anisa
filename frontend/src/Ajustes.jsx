import { logout } from "./apiClient";
import { useLocale } from "./localeContext";
import { useUsuario } from "./usuarioContext";
import LanguageSelector from "./LanguageSelector";
import { PageHeading } from "./Ui";

export default function Ajustes({ demo = false }) {
  const user = useUsuario();
  const { t } = useLocale();
  const visitor = demo && (!user || user.email.endsWith("@demo.anisa.test"));
  function signOut() { logout(); window.location.reload(); }
  function teamSignIn() {
    logout();
    window.location.assign("/?acceso=equipo");
  }
  return (
    <div className="max-w-2xl">
      <PageHeading title={t("settings")} />
      <section className="panel mb-6"><div className="panel-heading"><h2>{t(visitor ? "publicDemoAccess" : "account")}</h2></div><dl className="patient-details">
        <div><dt>{t("name")}</dt><dd>{visitor && user ? t("demoVisitor") : user?.nombre ?? "—"}</dd></div>
        {!visitor && <div><dt>{t("email")}</dt><dd dir="ltr">{user?.email ?? "—"}</dd></div>}
        <div><dt>{t("role")}</dt><dd>{user?.rol ? t(user.rol) : "—"}</dd></div>
      </dl><div className="panel-body">{visitor ? <div className="space-y-4"><p className="meta">{t("publicDemoNote")}</p><button type="button" className="button button-secondary" onClick={teamSignIn}>{t("teamSignIn")}</button></div> : <button className="button button-danger" onClick={signOut}>{t("signOut")}</button>}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>{t("interfaceLanguage")}</h2><p className="meta mt-1">{t("languageHelp")}</p></div><LanguageSelector /></div></section>
    </div>
  );
}
