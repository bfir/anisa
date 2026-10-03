import Sidebar, { MobileNavigation } from "./Sidebar";
import { UsuarioProvider } from "./UsuarioProvider";
import { useLocale } from "./localeContext";
import LanguageSelector from "./LanguageSelector";

function Layout({ children }) {
  const { t } = useLocale();
  return (
    <UsuarioProvider>
      <a href="#main-content" className="skip-link">{t("skipContent")}</a>
      <div className="app-shell">
        <Sidebar />
        <div className="workspace">
          <header className="topbar">
            <MobileNavigation />
            <div className="topbar-title">{t("workspace")}</div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="demo-label">{t("demo")}</span>
              <LanguageSelector />
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="main-content">{children}</main>
        </div>
      </div>
    </UsuarioProvider>
  );
}

export default Layout;
