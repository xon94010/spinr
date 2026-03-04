<script lang="ts">
	import type { Activity } from '$lib/types';

	interface Props {
		activities: Activity[];
	}

	let { activities }: Props = $props();

	// Filter activities with weight data, sorted oldest first
	let weightData = $derived.by(() => {
		return activities
			.filter(a => a.weight != null)
			.map(a => ({ date: a.date, weight: a.weight! }))
			.sort((a, b) => a.date.localeCompare(b.date));
	});

	// SVG dimensions
	const width = 600;
	const height = 200;
	const padding = { top: 20, right: 20, bottom: 40, left: 55 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Y-axis range: min-1 to max+1
	let minWeight = $derived(weightData.length > 0 ? Math.floor(Math.min(...weightData.map(d => d.weight)) - 1) : 0);
	let maxWeight = $derived(weightData.length > 0 ? Math.ceil(Math.max(...weightData.map(d => d.weight)) + 1) : 100);
	let weightRange = $derived(maxWeight - minWeight || 1);

	function getX(index: number): number {
		const count = weightData.length;
		if (count <= 1) return padding.left + chartWidth / 2;
		return padding.left + (index / (count - 1)) * chartWidth;
	}

	function getY(w: number): number {
		return padding.top + chartHeight - ((w - minWeight) / weightRange) * chartHeight;
	}

	// Line path
	let linePath = $derived.by(() => {
		if (weightData.length < 2) return '';
		return weightData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.weight)}`).join(' ');
	});

	// Area path
	let areaPath = $derived.by(() => {
		if (weightData.length < 2) return '';
		const line = weightData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.weight)}`).join(' ');
		const bottomY = padding.top + chartHeight;
		return `${line} L ${getX(weightData.length - 1)} ${bottomY} L ${getX(0)} ${bottomY} Z`;
	});

	// Linear regression trend line
	let trendLine = $derived.by(() => {
		if (weightData.length < 2) return '';
		const n = weightData.length;
		let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
		for (let i = 0; i < n; i++) {
			sumX += i;
			sumY += weightData[i].weight;
			sumXY += i * weightData[i].weight;
			sumX2 += i * i;
		}
		const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
		const intercept = (sumY - slope * sumX) / n;
		const y0 = intercept;
		const y1 = slope * (n - 1) + intercept;
		return `M ${getX(0)} ${getY(y0)} L ${getX(n - 1)} ${getY(y1)}`;
	});

	// Y-axis labels
	let yLabels = $derived.by(() => {
		const labels: { value: number; y: number }[] = [];
		const step = Math.max(Math.round(weightRange / 4), 1);
		for (let v = minWeight; v <= maxWeight; v += step) {
			labels.push({ value: v, y: getY(v) });
		}
		return labels;
	});

	// X-axis date labels
	let dateLabels = $derived.by(() => {
		if (weightData.length === 0) return [];
		const labels: { label: string; x: number }[] = [];
		const count = weightData.length;
		const step = Math.max(Math.floor(count / 5), 1);
		for (let i = 0; i < count; i += step) {
			const d = new Date(weightData[i].date);
			labels.push({
				label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				x: getX(i)
			});
		}
		// Always include last
		if (labels.length > 0 && labels[labels.length - 1].x !== getX(count - 1)) {
			const d = new Date(weightData[count - 1].date);
			labels.push({
				label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				x: getX(count - 1)
			});
		}
		return labels;
	});

	// Summary stats
	let summary = $derived.by(() => {
		if (weightData.length === 0) return null;
		const weights = weightData.map(d => d.weight);
		const current = weights[weights.length - 1];
		const min = Math.min(...weights);
		const max = Math.max(...weights);
		const delta = Math.round((current - weights[0]) * 10) / 10;
		return { current, min, max, delta };
	});

	// Tooltip state
	let hoveredIndex = $state<number | null>(null);
</script>

<div class="relative">
	{#if weightData.length === 0}
		<div class="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
			No weight data available
		</div>
	{:else}
		<svg viewBox="0 0 {width} {height}" class="w-full" style="height: 200px;">
			<defs>
				<linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="hsl(217 91% 60%)" stop-opacity="0.25" />
					<stop offset="100%" stop-color="hsl(217 91% 60%)" stop-opacity="0.02" />
				</linearGradient>
			</defs>

			<!-- Grid lines -->
			{#each yLabels as { value, y } (value)}
				<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity="0.1" />
				<text x={padding.left - 8} {y} text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">
					{value}
				</text>
			{/each}

			<!-- Date labels -->
			{#each dateLabels as { label, x } (x)}
				<text {x} y={height - 10} text-anchor="middle" class="fill-muted-foreground text-[10px]">
					{label}
				</text>
			{/each}

			<!-- Area fill -->
			<path d={areaPath} fill="url(#weightGradient)" />

			<!-- Trend line -->
			<path d={trendLine} fill="none" stroke="hsl(142 71% 45%)" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.7" />

			<!-- Weight line -->
			<path d={linePath} fill="none" stroke="hsl(217 91% 60%)" stroke-width="2.5" />

			<!-- Data points -->
			{#each weightData as point, i (i)}
				<circle
					cx={getX(i)}
					cy={getY(point.weight)}
					r={hoveredIndex === i ? 5 : 3}
					fill="hsl(217 91% 60%)"
					stroke="white"
					stroke-width="2"
					class="cursor-pointer"
					role="img"
					onmouseenter={() => hoveredIndex = i}
					onmouseleave={() => hoveredIndex = null}
				/>
			{/each}

			<!-- Tooltip -->
			{#if hoveredIndex !== null}
				{@const point = weightData[hoveredIndex]}
				{@const tx = getX(hoveredIndex)}
				{@const ty = getY(point.weight) - 14}
				<g>
					<rect x={tx - 40} y={ty - 12} width="80" height="16" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" stroke-width="1" />
					<text x={tx} y={ty - 2} text-anchor="middle" class="fill-foreground text-[10px] font-medium">
						{new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {point.weight} kg
					</text>
				</g>
			{/if}

			<!-- Y-axis label -->
			<text x={12} y={height / 2} text-anchor="middle" transform="rotate(-90 12 {height / 2})" class="fill-muted-foreground text-[10px]">
				Weight (kg)
			</text>
		</svg>

		<!-- Summary -->
		<div class="flex justify-center gap-6 mt-2 text-xs">
			{#if summary}
				<div class="text-center">
					<div class="text-muted-foreground">Current</div>
					<div class="text-lg font-semibold text-blue-500 tabular-nums">{summary.current} kg</div>
				</div>
				<div class="text-center">
					<div class="text-muted-foreground">Min</div>
					<div class="text-lg font-semibold text-muted-foreground tabular-nums">{summary.min} kg</div>
				</div>
				<div class="text-center">
					<div class="text-muted-foreground">Max</div>
					<div class="text-lg font-semibold text-muted-foreground tabular-nums">{summary.max} kg</div>
				</div>
				<div class="text-center">
					<div class="text-muted-foreground">Delta</div>
					<div class="text-lg font-semibold tabular-nums {summary.delta <= 0 ? 'text-green-500' : 'text-red-500'}">
						{summary.delta > 0 ? '+' : ''}{summary.delta} kg
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
