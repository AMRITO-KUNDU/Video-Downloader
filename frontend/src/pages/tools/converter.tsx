import { useState } from "react";
import { Calculator } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const accentColor = "#0ea5e9";

type Category = "length" | "mass" | "temperature" | "volume" | "data" | "speed" | "area";
interface Unit { label: string; factor?: number; toBase?: (v: number) => number; fromBase?: (v: number) => number; }

const CATEGORIES: Record<Category, { label: string; emoji: string; units: Record<string, Unit> }> = {
  length: { label: "Length", emoji: "📏", units: {
    km: { label: "Kilometres (km)", factor: 1000 }, m: { label: "Metres (m)", factor: 1 },
    cm: { label: "Centimetres (cm)", factor: 0.01 }, mm: { label: "Millimetres (mm)", factor: 0.001 },
    mi: { label: "Miles (mi)", factor: 1609.344 }, yd: { label: "Yards (yd)", factor: 0.9144 },
    ft: { label: "Feet (ft)", factor: 0.3048 }, in: { label: "Inches (in)", factor: 0.0254 },
    nm: { label: "Nautical miles (nm)", factor: 1852 },
  }},
  mass: { label: "Mass", emoji: "⚖️", units: {
    t: { label: "Tonnes (t)", factor: 1000000 }, kg: { label: "Kilograms (kg)", factor: 1000 },
    g: { label: "Grams (g)", factor: 1 }, mg: { label: "Milligrams (mg)", factor: 0.001 },
    lb: { label: "Pounds (lb)", factor: 453.592 }, oz: { label: "Ounces (oz)", factor: 28.3495 },
    st: { label: "Stone (st)", factor: 6350.29 },
  }},
  temperature: { label: "Temperature", emoji: "🌡️", units: {
    c:  { label: "Celsius (°C)",    toBase: (v) => v, fromBase: (v) => v },
    f:  { label: "Fahrenheit (°F)", toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
    k:  { label: "Kelvin (K)",      toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  }},
  volume: { label: "Volume", emoji: "🧪", units: {
    l: { label: "Litres (L)", factor: 1 }, ml: { label: "Millilitres (mL)", factor: 0.001 },
    m3: { label: "Cubic metres (m³)", factor: 1000 }, gal: { label: "Gallons (US)", factor: 3.78541 },
    qt: { label: "Quarts (qt)", factor: 0.946353 }, pt: { label: "Pints (pt)", factor: 0.473176 },
    cup: { label: "Cups", factor: 0.236588 }, floz: { label: "Fl oz (US)", factor: 0.0295735 },
  }},
  data: { label: "Data Size", emoji: "💾", units: {
    tb: { label: "Terabytes (TB)", factor: 1e12 }, gb: { label: "Gigabytes (GB)", factor: 1e9 },
    mb: { label: "Megabytes (MB)", factor: 1e6 }, kb: { label: "Kilobytes (KB)", factor: 1000 },
    b: { label: "Bytes (B)", factor: 1 }, gib: { label: "Gibibytes (GiB)", factor: 1073741824 },
    mib: { label: "Mebibytes (MiB)", factor: 1048576 }, kib: { label: "Kibibytes (KiB)", factor: 1024 },
  }},
  speed: { label: "Speed", emoji: "🚀", units: {
    ms: { label: "m/s", factor: 1 }, kmh: { label: "km/h", factor: 1 / 3.6 },
    mph: { label: "mph", factor: 0.44704 }, knot: { label: "Knots (kn)", factor: 0.514444 },
    c: { label: "Speed of light", factor: 299792458 },
  }},
  area: { label: "Area", emoji: "🗺️", units: {
    km2: { label: "km²", factor: 1e6 }, m2: { label: "m²", factor: 1 },
    cm2: { label: "cm²", factor: 0.0001 }, ha: { label: "Hectares (ha)", factor: 10000 },
    ac: { label: "Acres (ac)", factor: 4046.86 }, ft2: { label: "ft²", factor: 0.092903 },
  }},
};

function convert(value: number, from: string, to: string, cat: Category): number {
  if (from === to) return value;
  const units = CATEGORIES[cat].units;
  const fu = units[from], tu = units[to];
  if (fu.toBase && tu.fromBase) return tu.fromBase(fu.toBase(value));
  return (value * (fu as any).factor) / (tu as any).factor;
}

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
  return parseFloat(n.toPrecision(10)).toString();
}

export default function ConverterTool() {
  const [cat, setCat] = useState<Category>("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [inputVal, setInputVal] = useState("1");

  const catData = CATEGORIES[cat];
  const unitKeys = Object.keys(catData.units);

  const changeCategory = (c: Category) => {
    setCat(c);
    const keys = Object.keys(CATEGORIES[c].units);
    setFrom(keys[0]); setTo(keys[1] ?? keys[0]); setInputVal("1");
  };

  const numVal = parseFloat(inputVal);
  const result = isNaN(numVal) ? null : convert(numVal, from, to, cat);

  const swap = () => {
    const nf = to, nt = from;
    setFrom(nf); setTo(nt);
    if (result !== null) setInputVal(fmt(result));
  };

  const allResults = !isNaN(numVal)
    ? unitKeys.map((key) => ({ key, val: convert(numVal, from, key, cat), label: catData.units[key].label }))
    : [];

  return (
    <ToolLayout icon={<Calculator className="w-4 h-4" />} title="Unit Converter" accentColor={accentColor}>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Unit Converter</h2>
        <p className="text-slate-400 text-sm">Instantly convert between units across length, mass, temperature, and more.</p>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([key, data]) => (
          <button key={key} onClick={() => changeCategory(key)}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full transition-colors whitespace-nowrap shrink-0"
            style={{
              background: cat === key ? accentColor : "#f1f5f9",
              color: cat === key ? "white" : "#64748b",
            }}>
            {data.emoji} {data.label}
          </button>
        ))}
      </div>

      {/* Converter card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">From</label>
              <select value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none">
                {unitKeys.map((k) => <option key={k} value={k}>{catData.units[k].label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">To</label>
              <select value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none">
                {unitKeys.map((k) => <option key={k} value={k}>{catData.units[k].label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Input */}
            <div className="flex-1 rounded-2xl border-2 px-4 py-3" style={{ borderColor: accentColor }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: accentColor }}>{catData.units[from]?.label}</p>
              <input type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                className="w-full outline-none bg-transparent font-mono text-2xl font-bold text-slate-800" />
            </div>

            {/* Swap */}
            <button onClick={swap}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors hover:opacity-80"
              style={{ border: `1.5px solid ${accentColor}`, color: accentColor }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
              </svg>
            </button>

            {/* Result */}
            <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">{catData.units[to]?.label}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: accentColor }}>
                {result !== null ? fmt(result) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* All conversions */}
        {allResults.length > 0 && (
          <div className="border-t border-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-5 py-3">
              All conversions from {fmt(numVal)} {catData.units[from]?.label}
            </p>
            <div className="flex flex-col">
              {allResults.map(({ key, val, label }) => (
                <button key={key} onClick={() => setTo(key)}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  style={{ borderLeft: `3px solid ${key === to ? accentColor : "transparent"}` }}>
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="font-mono text-sm" style={{ color: key === to ? accentColor : "#334155", fontWeight: key === to ? 600 : 400 }}>
                    {fmt(val)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
