import type { ReactNode } from "react";
import type { SeriesPoint } from "@/types";
import { cn, formatNumber } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";

export function ChartCard({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} description={description} action={action} />
      <div className="flex-1 p-5">{children}</div>
    </Card>
  );
}

/** Screen-reader table that mirrors every chart. */
function SrTable({ caption, data, unit }: { caption: string; data: SeriesPoint[]; unit?: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.label}>
            <th scope="row">{d.label}</th>
            <td>
              {d.value}
              {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function niceMax(v: number) {
  const safe = Number.isFinite(v) && v > 0 ? v : 1;
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, safe))));
  return Math.max(1, Math.ceil(safe / p) * p);
}

const values = (data: SeriesPoint[]) => data.map((d) => (Number.isFinite(d.value) ? d.value : 0));

/** Shown instead of a chart when there is nothing to plot yet. */
function NoData({ caption, height = 160, text = "This chart fills in as activity is recorded." }: { caption: string; height?: number; text?: string }) {
  return (
    <figure className="flex flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper/60 px-4 text-center" style={{ minHeight: height }}>
      <p className="text-sm font-medium text-ink-700">No data yet</p>
      <p className="mt-1 text-[13px] text-ink-500">{text}</p>
      <figcaption className="sr-only">{caption}: no data yet</figcaption>
    </figure>
  );
}

/** With many points, show every n-th label so they never overlap. */
function labelStep(count: number) {
  if (count <= 12) return 1;
  if (count <= 24) return 2;
  if (count <= 45) return 4;
  return Math.ceil(count / 10);
}

/** Vertical bars built with CSS so labels stay legible at every width. */
export function BarChart({ data, caption, height = 200, highlightLast = false, unit = "", emptyText }: { data: SeriesPoint[]; caption: string; height?: number; highlightLast?: boolean; unit?: string; emptyText?: string }) {
  if (!data.length || values(data).every((v) => v === 0)) return <NoData caption={caption} height={height} text={emptyText} />;
  const step = labelStep(data.length);
  const max = niceMax(Math.max(...values(data)));
  const ticks = [max, max / 2, 0];
  return (
    <figure>
      <div className="flex gap-2" aria-hidden>
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-ink-400" style={{ height }}>
          {ticks.map((t) => (
            <span key={t}>{formatNumber(t)}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: height - 24 }}>
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-line" />
            ))}
          </div>
          <div className="relative flex items-end gap-[3%]" style={{ height }}>
            {data.map((d, i) => {
              const h = ((height - 24) * d.value) / max;
              const hi = highlightLast && i === data.length - 1;
              return (
                <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
                  <div className="relative w-full max-w-[36px]">
                    <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[11px] font-medium text-white group-hover:block">
                      {formatNumber(d.value)}
                      {unit}
                    </span>
                    <div className={cn("w-full rounded-t-[3px] transition-colors", hi ? "bg-hemo-600" : "bg-ink-200 group-hover:bg-ink-300")} style={{ height: h }} />
                  </div>
                  <span className="mt-1.5 h-[18px] truncate text-[11px] text-ink-500">{i % step === 0 || i === data.length - 1 ? d.label : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <SrTable caption={caption} data={data} unit={unit} />
    </figure>
  );
}

/** A point that may have no value (e.g. a rate for a month with no requests). */
export interface NullablePoint { label: string; value: number | null }

/** Line/area chart. The SVG stretches; labels are HTML so they don't distort. Gaps are left where a value is null. */
export function LineChart({ data, caption, height = 200, unit = "", min, emptyText }: { data: NullablePoint[]; caption: string; height?: number; unit?: string; min?: number; emptyText?: string }) {
  const present = data.filter((d): d is SeriesPoint => d.value !== null && Number.isFinite(d.value));
  if (data.length < 2 || present.length < 1) return <NoData caption={caption} height={height} text={emptyText} />;
  const vals = present.map((d) => d.value);
  const hi = Math.max(...vals);
  // Only honour a raised floor when every point sits above it.
  const lo = min !== undefined && min < Math.min(...vals) ? min : 0;
  const max = Math.max(niceMax(hi), lo + 1);
  const W = 100;
  const H = 100;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (max - lo)) * H;
  // Split into runs of consecutive values so missing buckets show as gaps.
  const runs: { i: number; v: number }[][] = [];
  data.forEach((d, i) => {
    if (d.value === null || !Number.isFinite(d.value)) return runs.push([]);
    if (!runs.length) runs.push([]);
    runs[runs.length - 1].push({ i, v: d.value });
  });
  const segments = runs.filter((r) => r.length);
  const step = labelStep(data.length);
  const lastIdx = [...data.keys()].reverse().find((i) => data[i].value !== null);
  const last = lastIdx !== undefined ? { i: lastIdx, v: data[lastIdx].value as number } : null;

  return (
    <figure>
      <div className="flex gap-2" aria-hidden>
        <div className="flex flex-col justify-between text-right text-[11px] tabular-nums text-ink-400" style={{ height }}>
          <span>{formatNumber(max)}{unit}</span>
          <span>{formatNumber(Math.round((max + lo) / 2))}{unit}</span>
          <span>{formatNumber(lo)}{unit}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2].map((t) => (
                <div key={t} className="border-t border-dashed border-line" />
              ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {segments.map((run, k) => {
                const line = run.map((p, j) => `${j ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
                const area = `${line} L${x(run[run.length - 1].i)},${H} L${x(run[0].i)},${H} Z`;
                return (
                  <g key={k}>
                    {run.length > 1 && <path d={area} className="fill-hemo-600/[0.07]" />}
                    <path d={line} className="fill-none stroke-hemo-600" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  </g>
                );
              })}
            </svg>
            {segments.flat().map((p) => (
              <span
                key={p.i}
                title={`${data[p.i].label}: ${p.v}${unit}`}
                className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-hemo-600", last && p.i === last.i ? "h-2.5 w-2.5 shadow" : "h-1.5 w-1.5")}
                style={{ left: `${x(p.i)}%`, top: `${y(p.v)}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-500">
            {data.map((d, i) => (
              <span key={`${d.label}-${i}`} className={cn(i % step !== 0 && i !== data.length - 1 && "invisible", step === 1 && i % 2 === 1 && "hidden sm:inline")}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}>
              <th scope="row">{d.label}</th>
              <td>{d.value === null ? "No data" : `${d.value}${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Two series side by side per bucket, e.g. requests vs donations. */
export function DualBarChart({ data, series, caption, height = 220, emptyText }: { data: { label: string; a: number; b: number }[]; series: [string, string]; caption: string; height?: number; emptyText?: string }) {
  if (!data.length || data.every((d) => !d.a && !d.b)) return <NoData caption={caption} height={height} text={emptyText} />;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.a || 0, d.b || 0))));
  const ticks = [max, max / 2, 0];
  const step = labelStep(data.length);
  return (
    <figure>
      <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-ink-600" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-hemo-600" />{series[0]}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink-700" />{series[1]}</span>
      </div>
      <div className="flex gap-2" aria-hidden>
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-ink-400" style={{ height }}>
          {ticks.map((t) => (
            <span key={t}>{formatNumber(t)}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: height - 24 }}>
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-line" />
            ))}
          </div>
          <div className="relative flex items-end gap-[2%]" style={{ height }}>
            {data.map((d, i) => (
              <div key={`${d.label}-${i}`} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
                <div className="relative flex w-full max-w-[44px] items-end justify-center gap-[2px]">
                  <span className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[11px] font-medium text-white group-hover:block">
                    {formatNumber(d.a)} / {formatNumber(d.b)}
                  </span>
                  <div className="w-1/2 rounded-t-[2px] bg-hemo-600" style={{ height: ((height - 24) * (d.a || 0)) / max }} />
                  <div className="w-1/2 rounded-t-[2px] bg-ink-700" style={{ height: ((height - 24) * (d.b || 0)) / max }} />
                </div>
                <span className="mt-1.5 h-[18px] truncate text-[11px] text-ink-500">{i % step === 0 || i === data.length - 1 ? d.label : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr><th scope="col">Period</th><th scope="col">{series[0]}</th><th scope="col">{series[1]}</th></tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}><th scope="row">{d.label}</th><td>{d.a}</td><td>{d.b}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const DONUT_COLORS = ["#A51C30", "#DE5F73", "#16233A", "#56647D", "#A5B0C2", "#C98A0B", "#2563A8", "#1F7A55"];

export function DonutChart({ data, caption, centerLabel, centerValue }: { data: SeriesPoint[]; caption: string; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((a, d) => a + (Number.isFinite(d.value) ? d.value : 0), 0);
  if (!data.length || total === 0) return <NoData caption={caption} />;
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <figure className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative w-40 shrink-0 sm:w-44">
        <svg viewBox="0 0 100 100" className="-rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="#E6EAF0" strokeWidth="12" />
          {data.map((d, i) => {
            const len = (d.value / total) * C;
            const seg = (
              <circle key={d.label} cx="50" cy="50" r={R} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="12" strokeDasharray={`${Math.max(0, len - 0.8)} ${C}`} strokeDashoffset={-offset}>
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return seg;
          })}
        </svg>
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
            <span className="text-xl font-bold tabular-nums text-ink-900">{centerValue}</span>
            {centerLabel && <span className="text-[11px] text-ink-500">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-6 gap-y-2 text-[13px]" aria-hidden>
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-ink-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              {d.label}
            </span>
            <span className="tabular-nums font-medium text-ink-900">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} data={data} />
    </figure>
  );
}

/** Horizontal ranked bars — good for categories with long labels. */
export function HBarList({ data, caption, unit = "", tone = "ink" }: { data: SeriesPoint[]; caption: string; unit?: string; tone?: "ink" | "hemo" }) {
  if (!data.length) return <NoData caption={caption} />;
  const max = Math.max(1, ...values(data));
  return (
    <figure>
      <ul className="space-y-3" aria-hidden>
        {data.map((d) => (
          <li key={d.label}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className="min-w-0 truncate text-ink-700">{d.label}</span>
              <span className="tabular-nums font-medium text-ink-900">{formatNumber(d.value)}{unit}</span>
            </div>
            <div className="h-2 rounded-full bg-ink-50">
              <div className={cn("h-full rounded-full", tone === "hemo" ? "bg-hemo-600" : "bg-ink-700")} style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} data={data} unit={unit} />
    </figure>
  );
}
