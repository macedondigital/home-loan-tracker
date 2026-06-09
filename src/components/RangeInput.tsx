import { useState, useEffect, type ReactNode } from 'react';

interface RangeInputProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  size?: 'default' | 'sm';
}

const GREEN = '#166534';
const RED = '#dc2626';
const TRACK = '#f5f5f4';

function trackFill(value: number, min: number, max: number, color: string): string {
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${TRACK} ${pct}%, ${TRACK} 100%)`;
}

// A number input and a slider bound to the same value. The number box lets the
// user type freely (and flags values above max in red); the stored value is
// always clamped to [min, max].
export default function RangeInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
  hint,
  size = 'default',
}: RangeInputProps) {
  const [display, setDisplay] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [exceeded, setExceeded] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(String(value));
      setExceeded(false);
    }
  }, [value, focused]);

  const handleNumberChange = (raw: string) => {
    setDisplay(raw);
    const parsed = raw === '' ? min : Number(raw);
    const v = Number.isNaN(parsed) ? min : parsed;
    setExceeded(v > max);
    onChange(Math.max(min, Math.min(v, max)));
  };

  const handleRangeChange = (raw: string) => {
    const v = Number(raw);
    setExceeded(false);
    if (!focused) setDisplay(String(v));
    onChange(v);
  };

  const sm = size === 'sm';
  const color = exceeded ? RED : GREEN;

  return (
    <div>
      <div style={s.row}>
        <label style={sm ? s.labelSm : s.label}>{label}</label>
        <div style={s.numberWrap}>
          {prefix && <span style={s.prefix}>{prefix}</span>}
          <input
            type="number"
            inputMode="decimal"
            value={display}
            step={step}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setDisplay(String(value));
              setExceeded(false);
            }}
            onChange={(e) => handleNumberChange(e.target.value)}
            style={{
              ...(sm ? s.numInputSm : s.numInput),
              ...(exceeded ? { borderBottomColor: RED, color: RED } : null),
            }}
          />
          {suffix && <span style={s.suffix}>{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        className={`scenario-range${sm ? ' range-sm' : ''}${exceeded ? ' range-exceeded' : ''}`}
        min={min}
        max={max}
        step={step}
        value={Math.max(min, Math.min(value, max))}
        onChange={(e) => handleRangeChange(e.target.value)}
        style={{ background: trackFill(value, min, max, color), marginTop: 8 }}
      />
      {hint && <p style={s.hint}>{hint}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  label: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#57534e' },
  labelSm: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#57534e' },
  numberWrap: { display: 'flex', alignItems: 'baseline', gap: 2, flexShrink: 0 },
  prefix: { color: '#a8a29e', fontSize: 13, fontFamily: "'SF Mono', Menlo, Monaco, monospace" },
  suffix: { color: '#a8a29e', fontSize: 13, marginLeft: 4 },
  numInput: {
    width: 100, textAlign: 'right', fontFamily: "'SF Mono', Menlo, Monaco, monospace",
    fontSize: 15, fontWeight: 600, background: 'transparent', border: 'none',
    borderBottom: '1px solid #e8e6df', color: '#1c1917', outline: 'none', padding: '2px 0',
  },
  numInputSm: {
    width: 80, textAlign: 'right', fontFamily: "'SF Mono', Menlo, Monaco, monospace",
    fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none',
    borderBottom: '1px solid #e8e6df', color: '#1c1917', outline: 'none', padding: '2px 0',
  },
  hint: { fontSize: 11, color: '#a8a29e', marginTop: 4, lineHeight: 1.4 },
};
