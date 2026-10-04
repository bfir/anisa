import { useEffect, useRef, useState } from "react";
import { Focus, Minus, Plus, RotateCw } from "lucide-react";
import { useLocale } from "./localeContext";

export default function CampusScene({ zones, selected, onSelect }) {
  const { t, number } = useLocale();
  const host = useRef(null);
  const markers = useRef({});
  const campus = useRef(null);
  const selection = useRef(selected);
  const onSelection = useRef(onSelect);
  const [status, setStatus] = useState("loading");
  const [zoom, setZoom] = useState(1);

  useEffect(() => { onSelection.current = onSelect; }, [onSelect]);
  useEffect(() => {
    selection.current = selected;
    campus.current?.select(selected);
  }, [selected]);
  useEffect(() => { campus.current?.layout(); }, [zones, status]);

  useEffect(() => {
    let active = true;
    const container = host.current;
    function lost(event) {
      event.preventDefault();
      campus.current?.dispose();
      campus.current = null;
      setStatus("unavailable");
    }
    import("./campus").then(({ createCampus }) => {
      if (!active) return;
      try {
        campus.current = createCampus(container, markers.current, (id) => onSelection.current(id));
        campus.current.select(selection.current);
        container.querySelector("canvas").addEventListener("webglcontextlost", lost);
        setStatus("ready");
      } catch {
        container.replaceChildren();
        setStatus("unavailable");
      }
    }).catch(() => { if (active) setStatus("unavailable"); });
    return () => {
      active = false;
      container.querySelector("canvas")?.removeEventListener("webglcontextlost", lost);
      campus.current?.dispose();
      campus.current = null;
    };
  }, []);

  function changeZoom(amount) {
    if (campus.current) setZoom(campus.current.zoom(amount));
  }

  return (
    <div className={`campus-scene campus-${status}`}>
      <div ref={host} className="campus-canvas" />
      {status !== "ready" && <p role="status" className="campus-status">{t(status === "loading" ? "loadingMap" : "mapUnavailable")}</p>}
      <div className="campus-markers" aria-label={t("selectZone")}>
        {zones.map(({ id, label, value, icon: Icon }) => (
          <button key={id} ref={(element) => { markers.current[id] = element; }}
            className={`campus-pin zone-${id}${selected === id ? " selected" : ""}`}
            onClick={() => onSelect(id)} aria-pressed={selected === id} aria-controls="zone-detail">
            <Icon size={15} aria-hidden="true" /><span>{label}</span><b>{value === null ? "—" : number(value)}</b>
          </button>
        ))}
      </div>
      {status === "ready" && (
        <div className="campus-controls" aria-label={t("cameraControls")}>
          <button aria-label={t("zoomIn")} title={t("zoomIn")} disabled={zoom >= 1.5} onClick={() => changeZoom(0.15)}><Plus size={17} aria-hidden="true" /></button>
          <button aria-label={t("zoomOut")} title={t("zoomOut")} disabled={zoom <= 0.75} onClick={() => changeZoom(-0.15)}><Minus size={17} aria-hidden="true" /></button>
          <button aria-label={t("rotateMap")} title={t("rotateMap")} onClick={() => campus.current?.rotate()}><RotateCw size={17} aria-hidden="true" /></button>
          <button aria-label={t("resetMap")} title={t("resetMap")} onClick={() => { campus.current?.reset(); setZoom(1); }}><Focus size={17} aria-hidden="true" /></button>
        </div>
      )}
      <p className="campus-caption">{t("conceptualMap")}</p>
    </div>
  );
}
