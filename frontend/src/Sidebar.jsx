import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, Calendar, MessageSquare, CreditCard, BarChart3, Settings, Plus, Bot, ShieldCheck } from "lucide-react";

const enlacesGestion = [
    { a: "/", texto: "Inicio", icono: LayoutGrid },
    { a: "/pacientes", texto: "Pacientes", icono: Users },
    { a: "/citas", texto: "Citas", icono: Calendar },
    { a: "/mensajes", texto: "Mensajes", icono: MessageSquare },
    { a: "/asistente", texto: "Asistente", icono: Bot },
];

const enlacesAdmin = [
    { a: "/pagos", texto: "Pagos", icono: CreditCard },
    { a: "/informes", texto: "Informes", icono:BarChart3 },
    { a: "/auditoria", texto: "Auditoría", icono: ShieldCheck },
    { a: "/ajustes", texto: "Ajustes", icono: Settings},
];

function ItemNav({ a, texto, icono: Icono}) {
    return (
        <NavLink
            to={a}
            end={a === "/"}
            className={({ isActive}) =>
                `flex items-center gap-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? "bg-teal-bg text-teal-ink" : "text-ink-soft hover:bg-surface"
                }`
            }
        >

            <Icono size={18} />
            {texto}
        </NavLink>
    );
}

function Sidebar() {
    return (
        <aside className="w-[220px] shrink-0 bg-bg border-r border-hairline flex flex-col p-4">
            <div className="flex items-center gap-2 px-1 mb-8">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
                    <Plus size={18} />
                </div>
                <div>
                    <p className="font-display text-lg leading-none">anisa</p>
                    <p className="text-[10px] tracking-widest text-ink-soft">CLÍNICA</p>
                </div>
            </div>

            <p className="text-[11px] font-semibold tracking-widest text-ink-soft/70 px-3 mb-2">GESTIÓN</p>
            <nav className="flex flex-col gap-1 mb-6">
                {enlacesGestion.map((item) => (
                    <ItemNav key={item.a} {...item} />
                ))}
            </nav>

            <p className="text-[11px] font-semibold tracking-widest text-ink-soft/70 px-3 mb-2">ADMINISTRACIÓN</p>
            <nav className="flex flex-col gap-1">
                {enlacesAdmin.map((item) => (
                    <ItemNav key={item.a} {...item} />
                ))}
            </nav>

            <div className="min-w-0">
                <p className="text-sm font-medium truncate">Administrador</p>
            </div>
        </aside>   
    );
}

export default Sidebar; 

