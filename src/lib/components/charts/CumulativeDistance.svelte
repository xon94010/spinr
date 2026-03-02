<script lang="ts">
	import type { Activity } from '$lib/types';

	interface Props {
		activities: Activity[];
	}

	let { activities }: Props = $props();

	// Get current month and previous month
	const today = new Date();
	const currentMonth = today.getMonth(); // 0-indexed
	const currentYear = today.getFullYear();
	const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
	const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];

	// Calculate cumulative distance by day of month
	let cumulativeData = $derived.by(() => {
		// Helper to get month key (YYYY-MM)
		const getMonthKey = (dateStr: string): string => dateStr.substring(0, 7);
		const getDayOfMonth = (dateStr: string): number => parseInt(dateStr.split('-')[2], 10);

		const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
		const prevMonthKey = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}`;

		// Filter activities for each month
		const currentMonthActivities = activities.filter(a => getMonthKey(a.date) === currentMonthKey);
		const prevMonthActivities = activities.filter(a => getMonthKey(a.date) === prevMonthKey);

		// Get today's day of month and days in previous month
		const todayDay = today.getDate();
		const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

		// Build daily distance maps
		const currentMonthDaily = new Map<number, number>();
		const prevMonthDaily = new Map<number, number>();

		for (const activity of currentMonthActivities) {
			const day = getDayOfMonth(activity.date);
			currentMonthDaily.set(day, (currentMonthDaily.get(day) || 0) + activity.distance);
		}

		for (const activity of prevMonthActivities) {
			const day = getDayOfMonth(activity.date);
			prevMonthDaily.set(day, (prevMonthDaily.get(day) || 0) + activity.distance);
		}

		// Build cumulative arrays
		const currentCumulative: { day: number; distance: number }[] = [];
		const previousCumulative: { day: number; distance: number }[] = [];

		let currentTotal = 0;
		let previousTotal = 0;
		let previousAtSameDay = 0;

		// Current month up to today
		for (let day = 1; day <= todayDay; day++) {
			currentTotal += currentMonthDaily.get(day) || 0;
			currentCumulative.push({ day, distance: currentTotal });
		}

		// Previous month full month
		for (let day = 1; day <= daysInPrevMonth; day++) {
			previousTotal += prevMonthDaily.get(day) || 0;
			previousCumulative.push({ day, distance: previousTotal });
			if (day === todayDay) {
				previousAtSameDay = previousTotal;
			}
		}

		return {
			current: currentCumulative,
			previous: previousCumulative,
			currentTotal,
			previousTotal,
			previousAtSameDay,
			diff: currentTotal - previousAtSameDay,
			diffPercent: previousAtSameDay > 0 ? ((currentTotal - previousAtSameDay) / previousAtSameDay) * 100 : 0,
			currentMonthName: monthNames[currentMonth],
			prevMonthName: monthNames[prevMonth],
			daysInPrevMonth
		};
	});

	// SVG dimensions
	const width = 600;
	const height = 200;
	const padding = { top: 20, right: 20, bottom: 40, left: 55 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Scales - use previous month length as max day for consistent x-axis
	let maxDay = $derived(cumulativeData.daysInPrevMonth);

	let maxDistance = $derived.by(() => {
		const currentMax = cumulativeData.current[cumulativeData.current.length - 1]?.distance || 0;
		const previousMax = cumulativeData.previous[cumulativeData.previous.length - 1]?.distance || 0;
		const dataMax = Math.max(currentMax, previousMax);
		// Round up to nearest 100, with minimum of 200
		return Math.max(Math.ceil(dataMax / 100) * 100, 200);
	});

	function getX(day: number): number {
		return padding.left + ((day - 1) / Math.max(maxDay - 1, 1)) * chartWidth;
	}

	function getY(distance: number): number {
		return padding.top + chartHeight - (distance / maxDistance) * chartHeight;
	}

	// Generate paths
	function generatePath(data: { day: number; distance: number }[]): string {
		if (data.length < 2) return '';
		return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.distance)}`).join(' ');
	}

	// Area path (filled under current month line)
	function generateAreaPath(data: { day: number; distance: number }[]): string {
		if (data.length < 2) return '';
		const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.distance)}`).join(' ');
		const lastX = getX(data[data.length - 1].day);
		const firstX = getX(data[0].day);
		const bottomY = padding.top + chartHeight;
		return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
	}

	let currentPath = $derived(generatePath(cumulativeData.current));
	let previousPath = $derived(generatePath(cumulativeData.previous));
	let areaPath = $derived(generateAreaPath(cumulativeData.current));

	// Day labels for x-axis
	let dayLabels = $derived.by(() => {
		const labels: { day: number; x: number }[] = [];
		const step = Math.ceil(maxDay / 6);
		for (let d = 1; d <= maxDay; d += step) {
			labels.push({ day: d, x: getX(d) });
		}
		// Always include last day
		if (labels[labels.length - 1]?.day !== maxDay) {
			labels.push({ day: maxDay, x: getX(maxDay) });
		}
		return labels;
	});

	// Y-axis labels
	let yLabels = $derived.by(() => {
		const labels: { value: number; y: number }[] = [];
		const step = Math.ceil(maxDistance / 4 / 100) * 100 || 100;
		for (let v = 0; v <= maxDistance; v += step) {
			labels.push({ value: v, y: getY(v) });
		}
		return labels;
	});
</script>

<div class="relative">
	{#if cumulativeData.current.length === 0}
		<div class="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
			No activity data for {cumulativeData.currentMonthName}
		</div>
	{:else}
		<svg viewBox="0 0 {width} {height}" class="w-full" style="height: 200px;">
			<!-- Grid lines -->
			{#each yLabels as { value, y } (value)}
				<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity="0.1" />
				<text x={padding.left - 8} {y} text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">
					{value.toLocaleString()}
				</text>
			{/each}

			<!-- Day labels -->
			{#each dayLabels as { day, x } (day)}
				<text {x} y={height - 10} text-anchor="middle" class="fill-muted-foreground text-[10px]">
					{day}
				</text>
			{/each}

			<!-- Area fill for current month -->
			<path d={areaPath} fill="hsl(217 91% 60% / 0.15)" />

			<!-- Previous month line (dotted) -->
			{#if cumulativeData.previous.length > 0}
				<path
					d={previousPath}
					fill="none"
					stroke="hsl(217 91% 60%)"
					stroke-width="2"
					stroke-dasharray="6 4"
					opacity="0.5"
				/>
			{/if}

			<!-- Current month line -->
			<path d={currentPath} fill="none" stroke="hsl(217 91% 60%)" stroke-width="2.5" />

			<!-- End points -->
			{#if cumulativeData.current.length > 0}
				{@const lastCurrent = cumulativeData.current[cumulativeData.current.length - 1]}
				<circle
					cx={getX(lastCurrent.day)}
					cy={getY(lastCurrent.distance)}
					r="5"
					fill="hsl(217 91% 60%)"
					stroke="white"
					stroke-width="2"
				/>
			{/if}

			{#if cumulativeData.previous.length > 0}
				{@const lastPrevious = cumulativeData.previous[cumulativeData.previous.length - 1]}
				<circle
					cx={getX(lastPrevious.day)}
					cy={getY(lastPrevious.distance)}
					r="4"
					fill="white"
					stroke="hsl(217 91% 60%)"
					stroke-width="2"
					opacity="0.7"
				/>
			{/if}

			<!-- Y-axis label -->
			<text x={12} y={height / 2} text-anchor="middle" transform="rotate(-90 12 {height / 2})" class="fill-muted-foreground text-[10px]">
				Distance (km)
			</text>

			<!-- Legend -->
			<g transform="translate({width - padding.right - 100}, {padding.top})">
				<line x1="0" y1="0" x2="20" y2="0" stroke="hsl(217 91% 60%)" stroke-width="2.5" />
				<text x="25" y="0" dominant-baseline="middle" class="fill-foreground text-[10px]">{cumulativeData.currentMonthName}</text>

				<line x1="0" y1="16" x2="20" y2="16" stroke="hsl(217 91% 60%)" stroke-width="2" stroke-dasharray="6 4" opacity="0.5" />
				<text x="25" y="16" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">{cumulativeData.prevMonthName}</text>
			</g>
		</svg>

		<!-- Summary -->
		<div class="flex justify-center gap-6 mt-2 text-xs">
			<div class="text-center">
				<div class="text-muted-foreground">{cumulativeData.currentMonthName} so far</div>
				<div class="text-lg font-semibold text-blue-500 tabular-nums">{cumulativeData.currentTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} km</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground">{cumulativeData.prevMonthName} (full)</div>
				<div class="text-lg font-semibold text-muted-foreground tabular-nums">{cumulativeData.previousTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} km</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground">vs same day</div>
				<div class="text-lg font-semibold tabular-nums {cumulativeData.diff >= 0 ? 'text-green-500' : 'text-red-500'}">
					{cumulativeData.diff >= 0 ? '+' : ''}{cumulativeData.diff.toLocaleString(undefined, { maximumFractionDigits: 0 })} km
				</div>
			</div>
		</div>
	{/if}
</div>
