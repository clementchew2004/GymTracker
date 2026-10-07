import type { ReactNode } from "react";
import { NavLink } from "react-router";

// One source of truth for the app's destinations, rendered two ways: as text
// tabs in the header on desktop, and as a fixed icon bar pinned to the bottom
// on mobile. Adding a screen here adds it to both, so they can't drift apart.
type Tab = {
  to: string;
  label: string;
  icon: ReactNode;
  // `end` stops NavLink's "/" tab matching every nested route. Required
  // rather than optional because exactOptionalPropertyTypes rejects passing
  // an explicit `undefined` through to NavLink.
  end: boolean;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Inline rather than an icon package — three glyphs isn't worth a dependency,
// and `currentColor` means the active/inactive text colour drives them.
function DumbbellIcon() {
  return (
    <svg {...iconProps} aria-hidden="true" className="size-6">
      <path d="M6.5 6.5v11M3.5 9.5v5M17.5 6.5v11M20.5 9.5v5M6.5 12h11" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg {...iconProps} aria-hidden="true" className="size-6">
      <path d="M4 4v16h16" />
      <path d="M7.5 14.5 11 11l3 2.5 5.5-5.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps} aria-hidden="true" className="size-6">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

const TABS: Tab[] = [
  { to: "/", label: "Log", icon: <DumbbellIcon />, end: true },
  { to: "/progress", label: "Progress", icon: <ChartIcon />, end: false },
  { to: "/summary", label: "Summary", icon: <CalendarIcon />, end: false },
];

const headerTabClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded px-3 py-1.5 text-sm transition-colors",
    isActive
      ? "bg-neutral-800 text-neutral-100"
      : "text-neutral-400 hover:text-neutral-100",
  ].join(" ");

const bottomTabClass = ({ isActive }: { isActive: boolean }) =>
  [
    // The link fills its whole grid cell, so the tap target is the full
    // 56px bar height rather than just the icon and label.
    "flex flex-col items-center justify-center gap-0.5 transition-colors",
    isActive ? "text-blue-400" : "text-neutral-500 active:text-neutral-300",
  ].join(" ");

/** Text tabs in the header. Hidden on mobile, where BottomNav takes over. */
export function HeaderNav() {
  return (
    <nav aria-label="Main" className="hidden gap-1 sm:flex">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={headerTabClass}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Thumb-reachable tab bar, mobile only. Lives at the very bottom of the
 * stacking order for bottom-pinned UI: the rest timer sits above it, offset
 * by --bottom-nav-h.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur sm:hidden"
      style={{
        height: "var(--bottom-nav-h)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={bottomTabClass}>
          {tab.icon}
          <span className="text-[11px] font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
