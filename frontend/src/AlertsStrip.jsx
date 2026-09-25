import { AlertTriangle, CalendarClock } from "lucide-react";
 function Alerta({ color, icono: Icono, titulo, detalle, accion}) {
    const estilos = {
        amber: "bg-amber-bg text-amber-ink",
        red: "bg-red-bg text-red-ink",
        teal: "bg-teal-bg text-teal-ink",
    };
    return (
        <div className="flex items-center gap-3 bg-surface border border-hairline rounded-2xl px-4 py-3 flex-1 min-w-[240px]">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${estilos[color]}`}>
                <Icono size= {18}/>
            </div>  
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{titulo}</p>
                <p className="text-xs text-ink-soft truncate">{detalle}</p>
            </div>
                <button className="text-sm font-medium whitespace-nowrap hover:underline">{accion} →</button>
        </div>
    );
}

function AlertsStrip({ pagosPendientes }) {
    const total = pagosPendientes.reduce((suma, p) => suma + p.importe, 0);
    const totalFormateado = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(total);

    return (
        <div className="flex flex-wrap gap-4">
            <Alerta
                color="amber"
                icono={AlertTriangle}
                titulo={`${pagosPendientes.length} pagos pendientes`}
                detalle={`${totalFormateado} por cobrar`}
                accion= "Revisar"
            />
            <Alerta
                color= "red"
                icono={CalendarClock}
                titulo="1 cita sin confirmar"
                detalle="Revisa la agenda de hoy"
                accion="Llamar"
            />
        </div>
    );
}

export default AlertsStrip;