type Point = {
  day: string;
  entrada: number;
  saida: number;
  saldo: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPolylinePoints(values: number[], width: number, height: number, padding: number) {
  const w = width - padding * 2;
  const h = height - padding * 2;
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));

  const points: string[] = [];
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  for (let i = 0; i < values.length; i += 1) {
    const x = padding + i * step;
    const normalized = clamp(values[i] / max, -1, 1);
    const y = padding + h / 2 - normalized * (h / 2);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

export function DailyChart({ points }: { points: Point[] }) {
  const width = 960;
  const height = 240;
  const padding = 18;

  const entrada = points.map((p) => p.entrada);
  const saida = points.map((p) => -p.saida);
  const saldo = points.map((p) => p.saldo);

  const entradaPolyline = toPolylinePoints(entrada, width, height, padding);
  const saidaPolyline = toPolylinePoints(saida, width, height, padding);
  const saldoPolyline = toPolylinePoints(saldo, width, height, padding);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-950">Gráfico por período</div>
          <div className="mt-1 text-xs text-zinc-500">Entrada (verde), Saída (vermelho), Saldo diário (azul)</div>
        </div>
        <div className="text-xs text-zinc-500">{points.length ? `${points[0].day} → ${points[points.length - 1].day}` : "—"}</div>
      </div>

      <div className="mt-4 overflow-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          role="img"
          aria-label="Gráfico diário de entradas, saídas e saldo"
        >
          <rect x="0" y="0" width={width} height={height} fill="white" />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#e4e4e7"
            strokeWidth="1"
          />
          <polyline fill="none" stroke="#16a34a" strokeWidth="2" points={entradaPolyline} />
          <polyline fill="none" stroke="#dc2626" strokeWidth="2" points={saidaPolyline} />
          <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={saldoPolyline} />
        </svg>
      </div>
    </div>
  );
}

