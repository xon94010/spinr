<script lang="ts">
	import type { Activity } from '$lib/types';
	import { calculateLoad } from '$lib/utils';

	interface Props {
		activities: Activity[];
		ftp: number;
	}

	let { activities, ftp }: Props = $props();

	// Group activities by week and calculate total load
	let weeklyData = $derived.by(() => {
		const weeks = new Map<string, { load: number; rides: number; duration: number }>();

		// Get Monday of each week from a date string (YYYY-MM-DD)
		const getWeekKey = (dateStr: string): string => {
			// Parse date parts to avoid timezone issues
			const [year, month, day] = dateStr.split('-').map(Number);
			const d = new Date(year, month - 1, day);
			const dayOfWeek = d.getDay();
			const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			d.setDate(d.getDate() + mondayOffset);
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${dd}`;
		};

		for (const activity of activities) {
			const weekKey = getWeekKey(activity.date);
			const existing = weeks.get(weekKey) || { load: 0, rides: 0, duration: 0 };
			// Use pre-calculated tss if available, otherwise calculate
			existing.load += activity.tss ?? calculateLoad(activity, ftp);
			existing.rides += 1;
			existing.duration += activity.duration;
			weeks.set(weekKey, existing);
		}

		// Convert to array and sort
		return Array.from(weeks.entries())
			.map(([week, data]) => ({
				week,
				weekLabel: formatWeekLabel(week),
				...data
			}))
			.sort((a, b) => a.week.localeCompare(b.week))
			.slice(-12); // Last 12 weeks
	});

	function formatWeekLabel(weekStart: string): string {
		const date = new Date(weekStart);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	}

	let maxLoad = $derived(Math.max(...weeklyData.map(w => w.load), 100));

	// Calculate trend line (simple linear regression)
	let trendLine = $derived.by(() => {
		if (weeklyData.length < 2) return null;

		const n = weeklyData.length;
		const sumX = (n * (n - 1)) / 2;
		const sumY = weeklyData.reduce((sum, w) => sum + w.load, 0);
		const sumXY = weeklyData.reduce((sum, w, i) => sum + i * w.load, 0);
		const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

		const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
		const intercept = (sumY - slope * sumX) / n;

		return { slope, intercept };
	});

	// SVG dimensions
	const width = 500;
	const height = 180;
	const padding = { top: 20, right: 20, bottom: 40, left: 45 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	let barWidth = $derived(weeklyData.length > 0 ? Math.min(40, (chartWidth / weeklyData.length) * 0.7) : 40);
	let barGap = $derived(weeklyData.length > 0 ? (chartWidth - barWidth * weeklyData.length) / (weeklyData.length + 1) : 10);

	// Current week
	const currentWeekKey = (() => {
		const d = new Date();
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1);
		d.setDate(diff);
		return d.toISOString().split('T')[0];
	})();

	// Summary stats
	let avgLoad = $derived(weeklyData.length > 0 ? Math.round(weeklyData.reduce((sum, w) => sum + w.load, 0) / weeklyData.length) : 0);
	let totalRides = $derived(weeklyData.reduce((sum, w) => sum + w.rides, 0));
</script>

<div class="relative">
	{#if weeklyData.length === 0}
		<div class="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
			No activity data available
		</div>
	{:else}
		<svg viewBox="0 0 {width} {height}" class="w-full" style="height: 180px;">
			<!-- Y-axis grid and labels -->
			{#each [0, 0.25, 0.5, 0.75, 1] as pct}
				{@const y = padding.top + chartHeight * (1 - pct)}
				{@const value = Math.round(maxLoad * pct)}
				<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity="0.1" />
				<text x={padding.left - 8} {y} text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">
					{value}
				</text>
			{/each}

			<!-- Trend line -->
			{#if trendLine}
				{@const y1 = padding.top + chartHeight - (trendLine.intercept / maxLoad) * chartHeight}
				{@const y2 = padding.top + chartHeight - ((trendLine.intercept + trendLine.slope * (weeklyData.length - 1)) / maxLoad) * chartHeight}
				<line
					x1={padding.left + barGap + barWidth / 2}
					{y1}
					x2={padding.left + barGap + (weeklyData.length - 1) * (barWidth + barGap) + barWidth / 2}
					{y2}
					stroke="hsl(142 71% 45%)"
					stroke-width="2"
					stroke-dasharray="6 4"
					opacity="0.6"
				/>
			{/if}

			<!-- Bars -->
			{#each weeklyData as week, i}
				{@const barHeight = (week.load / maxLoad) * chartHeight}
				{@const x = padding.left + barGap + i * (barWidth + barGap)}
				{@const y = padding.top + chartHeight - barHeight}
				{@const isCurrentWeek = week.week === currentWeekKey}

				<g class="cursor-pointer">
					<!-- Bar -->
					<rect
						{x}
						{y}
						width={barWidth}
						height={barHeight}
						rx="4"
						fill={isCurrentWeek ? 'hsl(217 91% 60%)' : 'hsl(217 91% 60% / 0.7)'}
						class="transition-all hover:fill-[hsl(217_91%_50%)]"
					/>

					<!-- Week label -->
					<text
						x={x + barWidth / 2}
						y={height - 8}
						text-anchor="middle"
						class="fill-muted-foreground text-[9px]"
					>
						{week.weekLabel}
					</text>

					<!-- Load value on top of bar -->
					{#if barHeight > 20}
						<text
							x={x + barWidth / 2}
							y={y + 14}
							text-anchor="middle"
							class="fill-white text-[10px] font-medium"
						>
							{week.load}
						</text>
					{/if}

					<title>Week of {week.weekLabel}: {week.load} Load, {week.rides} rides, {formatDuration(week.duration)}</title>
				</g>
			{/each}

			<!-- Y-axis label -->
			<text x={12} y={height / 2} text-anchor="middle" transform="rotate(-90 12 {height / 2})" class="fill-muted-foreground text-[10px]">
				Load (TSS)
			</text>
		</svg>

		<!-- Summary -->
		<div class="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
			<div>
				<span class="text-foreground font-medium">Avg:</span>
				<span class="tabular-nums">{avgLoad} Load/week</span>
			</div>
			<div>
				<span class="text-foreground font-medium">Total:</span>
				<span class="tabular-nums">{totalRides} rides</span>
			</div>
			{#if trendLine}
				<div>
					<span class="text-foreground font-medium">Trend:</span>
					<span class="tabular-nums {trendLine.slope > 0 ? 'text-green-500' : 'text-red-500'}">
						{trendLine.slope > 0 ? '+' : ''}{Math.round(trendLine.slope)}/week
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
