// Shared recharts styling, so every chart in the app reads the same way.

export const axisStyle = { fill: "#737373", fontSize: 12 };

export const tooltipStyle = {
  backgroundColor: "#171717",
  border: "1px solid #404040",
  borderRadius: "6px",
  fontSize: "13px",
};

export const tooltipLabelStyle = { color: "#a3a3a3" };

export const gridStroke = "#262626";
export const axisLineStroke = "#404040";

// Stable categorical palette, picked to stay legible on the dark ground.
export const SERIES_COLORS = [
  "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
  "#22d3ee", "#fb923c", "#f472b6", "#a3e635", "#94a3b8",
];
