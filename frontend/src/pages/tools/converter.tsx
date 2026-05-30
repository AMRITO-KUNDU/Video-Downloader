import { useState } from "react";
import { Calculator } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";

const ACCENT = "#006A6A";

type Category = "length" | "mass" | "temperature" | "volume" | "data" | "speed" | "area";

interface Unit { label: string; factor?: number; toBase?: (v: number) => number; fromBase?: (v: number) => number; }

const CATEGORIES: Record<Category, { label: string; emoji: string; units: Record<string, Unit> }> = {
  length: {
    label: "Length", emoji: "📏",
    units: {
      km:  { label: "Kilometres (km)",    factor: 1000 },
      m:   { label: "Metres (m)",          factor: 1 },
      cm:  { label: "Centimetres (cm)",    factor: 0.01 },
      mm:  { label: "Millimetres (mm)",    factor: 0.001 },
      mi:  { label: "Miles (mi)",          factor: 1609.344 },
      yd:  { label: "Yards (yd)",          factor: 0.9144 },
      ft:  { label: "Feet (ft)",           factor: 0.3048 },
      in:  { label: "Inches (in)",         factor: 0.0254 },
      nm:  { label: "Nautical miles (nm)", factor: 1852 },
    },
  },
  mass: {
    label: "Mass / Weight", emoji: "⚖️",
    units: {
      t:   { label: "Tonnes (t)",          factor: 1000000 },
      kg:  { label: "Kilograms (kg)",      factor: 1000 },
      g:   { label: "Grams (g)",           factor: 1 },
      mg:  { label: "Milligrams (mg)",     factor: 0.001 },
      lb:  { label: "Pounds (lb)",         factor: 453.592 },
      oz:  { label: "Ounces (oz)",         factor: 28.3495 },
      st:  { label: "Stone (st)",          factor: 6350.29 },
    },
  },
  temperature: {
    label: "Temperature", emoji: "🌡️",
    units: {
      c:  { label: "Celsius (°C)",    toBase: v => v, fromBase: v => v },
      f:  { label: "Fahrenheit (°F)", toBase: v => (v - 32) * 5/9, fromBase: v => v * 9/5 + 32 },
      k:  { label: "Kelvin (K)",      toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    },
  },
  volume: {
    label: "Volume", emoji: "🧪",
    units: {
      l:    { label: "Litres (L)",       factor: 1 },
      ml:   { label: "Millilitres (mL)", factor: 0.001 },
      m3:   { label: "Cubic metres (m³)",factor: 1000 },
      gal:  { label: "Gallons (US gal)", factor: 3.78541 },
      qt:   { label: "Quarts (qt)",      factor: 0.946353 },
      pt:   { label: "Pints (pt)",       factor: 0.473176 },
      cup:  { label: "Cups (cup)",       factor: 0.236588 },
      floz: { label: "Fl oz (US)",       factor: 0.0295735 },
      tbsp: { label: "Tablespoons",      factor: 0.0147868 },
      tsp:  { label: "Teaspoons",        factor: 0.00492892 },
    },
  },
  data: {
    label: "Data Size", emoji: "💾",
    units: {
      tb:  { label: "Terabytes (TB)",  factor: 1e12 },
      gb:  { label: "Gigabytes (GB)",  factor: 1e9 },
      mb:  { label: "Megabytes (MB)",  factor: 1e6 },
      kb:  { label: "Kilobytes (KB)",  factor: 1000 },
      b:   { label: "Bytes (B)",       factor: 1 },
      tib: { label: "Tebibytes (TiB)", factor: 1099511627776 },
      gib: { label: "Gibibytes (GiB)", factor: 1073741824 },
      mib: { label: "Mebibytes (MiB)", factor: 1048576 },
      kib: { label: "Kibibytes (KiB)", factor: 1024 },
    },
  },
  speed: {
    label: "Speed", emoji: "🚀",
    units: {
      ms:   { label: "m/s",        factor: 1 },
      kmh:  { label: "km/h",       factor: 1/3.6 },
      mph:  { label: "mph",        factor: 0.44704 },
      knot: { label: "Knots (kn)", factor: 0.514444 },
      c:    { label: "Speed of light (c)", factor: 299792458 },
    },
  },
  area: {
    label: "Area", emoji: "🗺️",
    units: {
      km2: { label: "km²",        factor: 1e6 },
      m2:  { label: "m²",         factor: 1 },
      cm2: { label: "cm²",        factor: 0.0001 },
      ha:  { label: "Hectares (ha)", factor: 10000 },
      ac:  { label: "Acres (ac)", factor: 4046.86 },
      mi2: { label: "mi²",        factor: 2589988.1 },
      ft2: { label: "ft²",        factor: 0.092903 },
    },
  },
};

function convert(value: number, from: string, to: string, cat: Category): number {
  if (from === to) return value;
  const units = CATEGORIES[cat].units;
  const fromU = units[from];
  const toU = units[to];
  // temperature uses custom fns
  if (fromU.toBase && toU.fromBase) {
    return toU.fromBase(fromU.toBase(value));
  }
  const fromU2 = units[from] as { factor: number };
  const toU2   = units[to]   as { factor: number };
  return (value * fromU2.factor) / toU2.factor;
}

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
  const s = parseFloat(n.toPrecision(10)).toString();
  return s;
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
    setFrom(keys[0]);
    setTo(keys[1] ?? keys[0]);
    setInputVal("1");
  };

  const numVal = parseFloat(inputVal);
  const result = isNaN(numVal) ? null : convert(numVal, from, to, cat);

  const swap = () => {
    const newFrom = to, newTo = from;
    setFrom(newFrom); setTo(newTo);
    if (result !== null) setInputVal(fmt(result));
  };

  // All results in one shot
  const allResults = !isNaN(numVal)
    ? unitKeys.map(key => ({ key, val: convert(numVal, from, key, cat), label: catData.units[key].label }))
    : [];

  return (
    <ToolLayout icon={<Calculator style={{ width: 16, height: 16 }} />} title="Unit Converter" accentColor={ACCENT}>
      <div>
        <h2 className="md-headline-small" style={{ color: "var(--md-on-surface)", marginBottom: 4 }}>Unit Converter</h2>
        <p className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>
          Instantly convert between units across length, mass, temperature, and more.
        </p>
      </div>

      {/* Category tabs — M3 scrollable tabs */}
      <div style={{ overflowX: "auto", paddingBottom: 2 }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([key, data]) => (
            <button key={key} onClick={() => changeCategory(key)} className="md-state-layer"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: "var(--md-shape-full)", border: "none",
                background: cat === key ? ACCENT : "var(--md-surface-container-low)",
                color: cat === key ? "#fff" : "var(--md-on-surface-variant)",
                cursor: "pointer", fontFamily: "'Roboto',sans-serif", fontSize: 13, fontWeight: 500,
                transition: "background 150ms, color 150ms", flexShrink: 0,
              }}>
              <span>{data.emoji}</span> {data.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main converter card */}
      <div style={{
        background: "var(--md-surface-container-lowest)", borderRadius: "var(--md-shape-lg)",
        boxShadow: "var(--md-elevation-1)", overflow: "hidden",
      }}>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* From row */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="md-label-medium" style={{ display: "block", color: "var(--md-on-surface-variant)", marginBottom: 4 }}>From</label>
              <select value={from} onChange={e => setFrom(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "var(--md-shape-xs)",
                  border: "1px solid var(--md-outline)", background: "var(--md-surface-container-lowest)",
                  fontFamily: "'Roboto',sans-serif", fontSize: 14, color: "var(--md-on-surface)", outline: "none",
                }}>
                {unitKeys.map(k => <option key={k} value={k}>{catData.units[k].label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="md-label-medium" style={{ display: "block", color: "var(--md-on-surface-variant)", marginBottom: 4 }}>To</label>
              <select value={to} onChange={e => setTo(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "var(--md-shape-xs)",
                  border: "1px solid var(--md-outline)", background: "var(--md-surface-container-lowest)",
                  fontFamily: "'Roboto',sans-serif", fontSize: 14, color: "var(--md-on-surface)", outline: "none",
                }}>
                {unitKeys.map(k => <option key={k} value={k}>{catData.units[k].label}</option>)}
              </select>
            </div>
          </div>

          {/* Input + result */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Input */}
            <div style={{ flex: 1, borderRadius: "var(--md-shape-xs)", border: `2px solid ${ACCENT}`, padding: "10px 14px", background: "var(--md-surface-container-lowest)" }}>
              <label className="md-label-small" style={{ color: ACCENT, display: "block", marginBottom: 2 }}>{catData.units[from]?.label}</label>
              <input
                type="number" value={inputVal} onChange={e => setInputVal(e.target.value)}
                style={{
                  width: "100%", border: "none", outline: "none", background: "transparent",
                  fontFamily: "'Roboto Mono', monospace", fontSize: 22, fontWeight: 500,
                  color: "var(--md-on-surface)",
                }} />
            </div>

            {/* Swap button */}
            <button onClick={swap} className="md-state-layer"
              style={{
                width: 40, height: 40, borderRadius: "var(--md-shape-full)", border: `1px solid ${ACCENT}`,
                background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: ACCENT, flexShrink: 0,
              }}
              title="Swap units">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/>
              </svg>
            </button>

            {/* Result */}
            <div style={{ flex: 1, borderRadius: "var(--md-shape-xs)", border: "1px solid var(--md-outline-variant)", padding: "10px 14px", background: "var(--md-surface-container-low)" }}>
              <label className="md-label-small" style={{ color: "var(--md-on-surface-variant)", display: "block", marginBottom: 2 }}>{catData.units[to]?.label}</label>
              <p style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 22, fontWeight: 500, color: ACCENT, margin: 0 }}>
                {result !== null ? fmt(result) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* All units conversion table */}
        {allResults.length > 0 && (
          <div style={{ borderTop: "1px solid var(--md-outline-variant)" }}>
            <div style={{ padding: "10px 20px 4px" }}>
              <p className="md-label-medium" style={{ color: "var(--md-on-surface-variant)", textTransform: "uppercase" }}>All conversions from {fmt(numVal)} {catData.units[from]?.label}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {allResults.map(({ key, val, label }) => (
                <button key={key} onClick={() => { setTo(key); }}
                  className="md-state-layer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px", border: "none", background: key === to ? ACCENT + "0F" : "transparent",
                    cursor: "pointer", textAlign: "left", borderLeft: key === to ? `3px solid ${ACCENT}` : "3px solid transparent",
                  }}>
                  <span className="md-body-medium" style={{ color: "var(--md-on-surface-variant)" }}>{label}</span>
                  <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 14, color: key === to ? ACCENT : "var(--md-on-surface)", fontWeight: key === to ? 500 : 400 }}>
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
