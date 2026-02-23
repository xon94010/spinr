const RIDER_COLORS = [
	'#3b82f6', // blue
	'#ef4444', // red
	'#22c55e', // green
	'#f59e0b', // amber
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#14b8a6', // teal
	'#f97316', // orange
	'#06b6d4', // cyan
	'#a855f7', // purple
	'#84cc16', // lime
	'#e11d48', // rose
	'#0ea5e9', // sky
	'#d946ef', // fuchsia
	'#10b981', // emerald
	'#eab308', // yellow
	'#6366f1', // indigo
	'#fb923c', // light orange
	'#2dd4bf', // light teal
	'#c084fc', // light purple
	'#4ade80', // light green
	'#f472b6', // light pink
	'#38bdf8', // light sky
	'#a3e635', // light lime
];

export function getRiderColor(index: number): string {
	return RIDER_COLORS[index % RIDER_COLORS.length];
}

export const SELECTED_RING_COLOR = '#ffffff';
export const FOLLOW_RING_COLOR = '#fbbf24';
export const ROUTE_COLOR = 'rgba(255, 255, 255, 0.15)';
export const ROUTE_STROKE_WIDTH = 2;
