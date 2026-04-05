export interface Category {
  id: string;
  label: string;
  target: number | null;
  color: string;
  patterns: RegExp[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'uber-eats',
    label: 'Uber Eats',
    target: 0,
    color: '#dc2626',
    patterns: [/uber\s*\*?\s*eats/i],
  },
  {
    id: 'amazon',
    label: 'Amazon',
    target: 100,
    color: '#ea580c',
    patterns: [/amazon/i],
  },
  {
    id: 'eating-out',
    label: 'Eating out',
    target: 200,
    color: '#d97706',
    patterns: [
      /sushi/i, /pizza/i, /guzman/i, /cafe/i, /bakery/i,
      /cheesecake shop/i, /schnitz/i, /wharf shed/i, /soul origin/i,
      /torquay hotel/i, /taste jamaica/i, /\bluka\b/i, /woodhouse/i,
      /paddington/i, /cinnabar/i, /aohna/i, /untitled/i, /twistto/i,
      /pro whipp/i, /boost leopold/i, /hi sushi/i, /great ocean rolls/i,
      /gelato/i, /highland milkbar/i, /waurn ponds pty/i,
      /bellarine estate/i, /rob s amusements/i,
    ],
  },
  {
    id: 'groceries',
    label: 'Groceries',
    target: null,
    color: '#166534',
    patterns: [/coles/i, /woolworths/i, /a to z meats/i, /fresh food/i],
  },
  {
    id: 'fuel',
    label: 'Fuel',
    target: null,
    color: '#6b7280',
    patterns: [/\bbp\b/i, /ampol/i, /apco/i, /\bshell\b/i, /mobil/i, /reddy express/i, /mortimer petrol/i],
  },
  {
    id: 'retail',
    label: 'Retail',
    target: 150,
    color: '#7c3aed',
    patterns: [
      /kmart/i, /rebel/i, /shoes & sox/i, /jd sports/i, /nike/i,
      /bonds/i, /sportsgirl/i, /myer/i, /bunnings/i, /officeworks/i,
      /bigw/i, /\btarget\b/i, /colour blast/i,
    ],
  },
  {
    id: 'kids',
    label: 'Kids activities',
    target: null,
    color: '#0891b2',
    patterns: [
      /adventure park/i, /bounce/i, /flip out/i, /geelong ninjas/i,
      /splashdown/i, /buckley/i, /moshtix/i, /codespark/i, /paparazzi studios/i,
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    target: null,
    color: '#6b7280',
    patterns: [
      /netflix/i, /spotify/i, /google one/i, /prime vide/i,
      /swellnet/i, /fairfax/i, /uber.*pass/i, /uberdirect.*pass/i,
    ],
  },
  {
    id: 'health',
    label: 'Health / pharmacy',
    target: null,
    color: '#ec4899',
    patterns: [
      /amcal/i, /pharmac/i, /chemist/i, /medicann/i, /instant script/i,
      /holistic health/i, /professional whey/i, /geelong soul patt/i, /pharmacy/i,
      /\bdco\b/i,
    ],
  },
  {
    id: 'child-support',
    label: 'Child support',
    target: 1200,
    color: '#6b7280',
    patterns: [/sarah smith/i],
  },
  {
    id: 'bills',
    label: 'Bills / insurance',
    target: null,
    color: '#6b7280',
    patterns: [/agl sales/i, /barwon water/i, /aust unity/i, /vicroads/i],
  },
];

export function categorise(description: string, amount: number): string {
  // Income: any positive amount
  if (amount > 0) return 'income';

  for (const cat of CATEGORIES) {
    for (const pattern of cat.patterns) {
      if (pattern.test(description)) {
        return cat.id;
      }
    }
  }

  return 'other';
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export const ALL_CATEGORY_IDS = [
  ...CATEGORIES.map((c) => c.id),
  'income',
  'other',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  income: 'Income',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color])),
  income: '#166534',
  other: '#9ca3af',
};

export const CATEGORY_TARGETS: Record<string, number | null> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.target])),
  income: null,
  other: null,
};
