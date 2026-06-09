import { calculate, type Scenario, type SharedInputs } from '../lib/scenario';
import PropertyScenario from './PropertyScenario';

interface Props {
  scenarios: Scenario[];
  shared: SharedInputs;
  onFieldChange: (id: number, field: 'propertyTarget' | 'superContrib' | 'prepaid' | 'bucket', value: number) => void;
  onNameChange: (id: number, value: string) => void;
  onDescChange: (id: number, value: string) => void;
}

export default function ScenarioGrid({
  scenarios, shared, onFieldChange, onNameChange, onDescChange,
}: Props) {
  return (
    <div style={s.grid}>
      {scenarios.map((scenario) => (
        <PropertyScenario
          key={scenario.id}
          scenario={scenario}
          result={calculate(scenario, shared)}
          onFieldChange={(field, value) => onFieldChange(scenario.id, field, value)}
          onNameChange={(value) => onNameChange(scenario.id, value)}
          onDescChange={(value) => onDescChange(scenario.id, value)}
        />
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid', gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    alignItems: 'stretch',
  },
};
