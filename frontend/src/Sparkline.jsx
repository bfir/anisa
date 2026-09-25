function Sparkline({ datos, color = "var(--color-accent)" }) {
  const ancho = 100;
  const alto = 28;
  const max = Math.max(...datos);
  const min = Math.min(...datos);
  const rango = max - min || 1;

  const puntos = datos
    .map((valor, i) => {
      const x = (i / (datos.length - 1)) * ancho;
      const y = alto - ((valor - min) / rango) * alto;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-7" preserveAspectRatio="none">
      <polyline
        points={puntos}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
