// Compact lucide-style stroke icons used across the Scenarios tab, matching the
// reference prototype. Inline SVG keeps them dependency-free.

interface IconProps {
  size?: number;
}

function svg(size: number, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const IconTrust = ({ size = 13 }: IconProps) =>
  svg(size, <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>);

export const IconWallet = ({ size = 13 }: IconProps) =>
  svg(size, <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>);

export const IconBuilding = ({ size = 13 }: IconProps) =>
  svg(size, <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /></>);

export const IconTrend = ({ size = 13 }: IconProps) =>
  svg(size, <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>);

export const IconCalendar = ({ size = 13 }: IconProps) =>
  svg(size, <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>);

export const IconShield = ({ size = 13 }: IconProps) =>
  svg(size, <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);

export const IconHome = ({ size = 13 }: IconProps) =>
  svg(size, <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 22V12h6v10" /></>);

export const IconPiggy = ({ size = 13 }: IconProps) =>
  svg(size, <><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" /></>);

export const IconReceipt = ({ size = 13 }: IconProps) =>
  svg(size, <path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2Z" />);
