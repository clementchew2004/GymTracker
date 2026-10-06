import { Link } from "react-router";
import { lastCompletedWeekStart, weekKey } from "../lib/summaryData";

const DISMISSED_KEY = "gymtracker_summary_seen";

/**
 * Prompts you toward last week's summary once the week has ended.
 *
 * Dismissal is stored against the week itself, so the banner comes back
 * every Monday rather than being gone for good.
 */
export function SummaryBanner() {
  const week = weekKey(lastCompletedWeekStart(new Date()));

  // localStorage throws in some private-browsing modes — a banner isn't
  // worth crashing the page for.
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISSED_KEY) === week;
  } catch {
    /* treat as not dismissed */
  }

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, week);
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="mb-5 flex items-center gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
      <span className="flex-1">Last week's summary is ready.</span>
      <Link
        to="/summary"
        onClick={dismiss}
        className="font-medium text-blue-400 hover:text-blue-300"
      >
        View
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-neutral-500 hover:text-neutral-300"
      >
        ✕
      </button>
    </div>
  );
}
