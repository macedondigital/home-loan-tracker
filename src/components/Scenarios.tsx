import { useState, useEffect, useRef } from 'react';
import {
  DEFAULT_SHARED, DEFAULT_SCENARIOS,
  type Scenario, type SharedInputs as SharedInputsState,
} from '../lib/scenario';
import SharedInputs from './SharedInputs';
import ScenarioGrid from './ScenarioGrid';
import ExpenseAccordion from './ExpenseAccordion';
import RevenueForecast from './RevenueForecast';

const STORAGE_KEY = 'hbo-scenarios-v1';

export default function Scenarios() {
  const [shared, setShared] = useState<SharedInputsState>(DEFAULT_SHARED);
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const hydrated = useRef(false);

  // Load any saved state once on mount (localStorage is client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.shared) setShared({ ...DEFAULT_SHARED, ...parsed.shared });
        if (Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0) {
          setScenarios(parsed.scenarios);
        }
      }
    } catch {
      // Ignore corrupt storage and fall back to defaults.
    }
    hydrated.current = true;
  }, []);

  // Persist on change, but not before the initial load has run.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shared, scenarios }));
    } catch {
      // Storage may be unavailable (private mode); ignore.
    }
  }, [shared, scenarios]);

  const updateShared = (field: keyof SharedInputsState, value: number) => {
    setShared((prev) => ({ ...prev, [field]: value }));
  };

  const updateScenarioField = (
    id: number,
    field: 'propertyTarget' | 'superContrib' | 'prepaid' | 'bucket',
    value: number,
  ) => {
    setScenarios((prev) => prev.map((sc) => (sc.id === id ? { ...sc, [field]: value } : sc)));
  };

  const updateScenarioName = (id: number, name: string) => {
    setScenarios((prev) => prev.map((sc) => (sc.id === id ? { ...sc, name } : sc)));
  };

  const updateScenarioDesc = (id: number, description: string) => {
    setScenarios((prev) => prev.map((sc) => (sc.id === id ? { ...sc, description } : sc)));
  };

  const resetAll = () => {
    setShared(DEFAULT_SHARED);
    setScenarios(DEFAULT_SCENARIOS.map((sc) => ({ ...sc })));
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <header style={s.header}>
        <div>
          <div style={s.eyebrow}>
            <span style={{ color: '#166534' }}>Scenarios</span>
            <span>{'·'}</span>
            <span>Home purchase + tax planner</span>
          </div>
          <h1 style={s.h1}>Three property scenarios for October settlement</h1>
          <p style={s.subtitle}>
            Updated with actual P&amp;L through 9 June ($308k YTD net profit). Adjust the
            property target on each scenario to see how cash needed and surplus change. Full
            standard VIC stamp duty applies (no first home buyer concession).
          </p>
        </div>
        <button type="button" style={s.resetBtn} onClick={resetAll}>
          Reset all
        </button>
      </header>

      <div style={s.contextCard}>
        <strong style={{ color: '#166534', fontWeight: 600 }}>Stamp duty:</strong>{' '}
        You are not a first home buyer, so VIC FHB exemptions and concessions do not apply.
        Full standard duty applies at every price point ($34k at $650k, $40k at $750k). The
        Family Home Guarantee Single Parent Stream gives a 2% deposit with no LMI, but it is a
        federal deposit scheme, not a stamp duty benefit. Going cheaper still helps via a
        smaller loan and lower repayments, but the stamp duty saving is modest (~$6k between
        $650k and $750k).
      </div>

      <ExpenseAccordion />

      <SharedInputs shared={shared} onChange={updateShared} />

      <RevenueForecast shared={shared} onChange={updateShared} />

      <div style={s.scenariosMeta}>{scenarios.length} property scenarios</div>

      <ScenarioGrid
        scenarios={scenarios}
        shared={shared}
        onFieldChange={updateScenarioField}
        onNameChange={updateScenarioName}
        onDescChange={updateScenarioDesc}
      />

      <div style={s.footer}>
        <p>
          <strong style={s.footerStrong}>FHG loan assumption:</strong> Family Home Guarantee
          Single Parent Stream allows a 2% deposit with no LMI. Loan = 98% of property value.
          Previous property ownership does not disqualify (FHG is not a first home buyer scheme).
        </p>
        <p>
          <strong style={s.footerStrong}>Stamp duty:</strong> Calculated at standard VIC
          owner-occupier rates with no concession. The first home buyer exemption does not apply
          because of previous property ownership. The PPR concession only applies under $550k, so
          it does not apply in this price range. Above $130k, duty is $2,870 + 6% of the excess
          over $130k.
        </p>
        <p>
          <strong style={s.footerStrong}>Cash flow logic:</strong> Super is funded from personal
          cash first, topped up from the business. Prepay is paid directly by the business.
          Personal income tax is assumed already covered by PAYG instalments paid through the
          year, so it is not double-counted against the 30 June cash position.
        </p>
        <p>
          <strong style={s.footerStrong}>Not financial advice.</strong> Confirm with Sarah before
          acting and verify Simon's serviceability treatment of super contributions.
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: 16, display: 'flex', alignItems: 'flex-end',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
  },
  eyebrow: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500,
    color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  },
  h1: { fontFamily: 'Georgia, serif', fontSize: 28, color: '#1c1917', lineHeight: 1.2, fontWeight: 600, margin: 0 },
  subtitle: { color: '#57534e', marginTop: 4, fontSize: 14, maxWidth: 720, lineHeight: 1.5 },
  resetBtn: {
    fontSize: 12, color: '#57534e', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e8e6df', background: '#fff', cursor: 'pointer',
  },
  contextCard: {
    padding: '14px 16px', marginBottom: 16, background: '#f7fef9', border: '1px solid #bbf7d0',
    borderRadius: 12, fontSize: 13, color: '#57534e', lineHeight: 1.5,
  },
  scenariosMeta: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#78716c', marginBottom: 12, marginTop: 8,
  },
  footer: { marginTop: 24, padding: '0 4px', fontSize: 11, color: '#78716c', lineHeight: 1.5 },
  footerStrong: { color: '#57534e', fontWeight: 600 },
};
