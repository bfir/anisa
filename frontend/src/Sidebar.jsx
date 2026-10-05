import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { LayoutGrid, Users, Calendar, MessageSquare, CreditCard, BarChart3, Settings, Bot, ShieldCheck, Menu } from "lucide-react";
import { useUsuario } from "./usuarioContext";
import { useLocale } from "./localeContext";
import { Avatar, Brand } from "./Ui";

const managementLinks = [
  { to: "/", key: "home", icon: LayoutGrid },
  { to: "/pacientes", key: "patients", icon: Users },
  { to: "/citas", key: "appointments", icon: Calendar },
  { to: "/mensajes", key: "messages", icon: MessageSquare },
  { to: "/asistente", key: "assistant", icon: Bot },
];
const adminLinks = [
  { to: "/pagos", key: "payments", icon: CreditCard },
  { to: "/informes", key: "reports", icon: BarChart3 },
  { to: "/auditoria", key: "audit", icon: ShieldCheck, role: "admin" },
  { to: "/ajustes", key: "settings", icon: Settings },
];

function NavigationLinks({ links, onNavigate }) {
  const { t } = useLocale();
  return links.map(({ to, key, icon: Icon }) => (
    <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />{t(key)}
    </NavLink>
  ));
}

function useVisibleLinks() {
  const user = useUsuario();
  return adminLinks.filter((link) => !link.role || link.role === user?.rol);
}

export function MobileNavigation() {
  const { t } = useLocale();
  const visibleLinks = useVisibleLinks();
  const location = useLocation();
  const menu = useRef(null);

  useEffect(() => {
    menu.current.open = false;
  }, [location.pathname]);

  function closeMenu() {
    menu.current.open = false;
    menu.current.querySelector("summary").focus();
  }

  return (
    <details ref={menu} className="mobile-navigation" onKeyDown={(e) => {
      if (e.key === "Escape") closeMenu();
    }}>
      <summary aria-label={t("openMenu")}><Menu size={20} aria-hidden="true" /><span>anisa</span></summary>
      <nav aria-label={t("navigation")} className="mobile-menu">
        <NavigationLinks links={[...managementLinks, ...visibleLinks]} onNavigate={closeMenu} />
      </nav>
    </details>
  );
}

export default function Sidebar() {
  const user = useUsuario();
  const { t } = useLocale();
  const visibleLinks = useVisibleLinks();
  return (
    <aside className="sidebar">
      <Brand />
      <p className="sidebar-workspace">{t("workspace")}</p>
      <p className="nav-group">{t("management")}</p>
      <nav aria-label={t("management")}><NavigationLinks links={managementLinks} /></nav>
      <p className="nav-group">{t("administration")}</p>
      <nav aria-label={t("administration")}><NavigationLinks links={visibleLinks} /></nav>
      <div className="sidebar-account">
        <Avatar name={user?.nombre} />
        <div className="min-w-0">
          <p className="text-sm font-semibold break-words">{user?.nombre ?? "…"}</p>
          <p className="meta">{user?.rol && t(user.rol)}</p>
        </div>
      </div>
    </aside>
  );
}
