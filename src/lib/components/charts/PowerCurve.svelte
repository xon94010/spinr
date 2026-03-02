<script lang="ts">
	import type { Activity } from '$lib/types';

	interface Props {
		activities: Activity[];
		ftp: number;
		weight: number;
		peaks?: Record<string, number>;
	}

	let { ftp, weight, peaks }: Props = $props();

	let hoveredPoint = $state<{ label: string; power: number; wpkg: string; x: number; y: number } | null>(null);

	// Duration labels and their values in seconds
	const durations = [
		{ label: '5s', seconds: 5 },
		{ label: '15s', seconds: 15 },
		{ label: '30s', seconds: 30 },
		{ label: '1m', seconds: 60 },
		{ label: '5m', seconds: 300 },
		{ label: '20m', seconds: 1200 },
		{ label: '60m', seconds: 3600 }
	];

	// Get peak values from props or calculate from activities
	let peakValues = $derived.by(() => {
		if (peaks && Object.keys(peaks).length > 0) {
			return durations.map(d => peaks[d.label] || 0);
		}
		// Fallback: estimate from activity data if no peaks provided
		return durations.map(() => 0);
	});

	let maxPower = $derived(Math.max(...peakValues, ftp * 1.5));
	let minPower = $derived(Math.min(...peakValues.filter(v => v > 0), ftp * 0.5));

	// SVG dimensions
	const width = 500;
	const height = 200;
	const padding = { top: 20, right: 20, bottom: 40, left: 50 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Generate smooth curve path using logarithmic x-scale
	let curvePath = $derived.by(() => {
		const validPoints = peakValues
			.map((power, i) => ({ power, seconds: durations[i].seconds }))
			.filter(p => p.power > 0);

		if (validPoints.length < 2) return '';

		const points = validPoints.map(p => {
			const x = padding.left + (Math.log10(p.seconds) / Math.log10(3600)) * chartWidth;
			const y = padding.top + chartHeight - ((p.power - minPower) / (maxPower - minPower)) * chartHeight;
			return { x, y };
		});

		// Create smooth curve using quadratic bezier
		let path = `M ${points[0].x} ${points[0].y}`;
		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			const cpX = (prev.x + curr.x) / 2;
			path += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y}, ${cpX} ${(prev.y + curr.y) / 2}`;
		}
		const last = points[points.length - 1];
		path += ` L ${last.x} ${last.y}`;

		return path;
	});

	// Generate area path (filled area under curve)
	let areaPath = $derived.by(() => {
		const validPoints = peakValues
			.map((power, i) => ({ power, seconds: durations[i].seconds }))
			.filter(p => p.power > 0);

		if (validPoints.length < 2) return '';

		const points = validPoints.map(p => {
			const x = padding.left + (Math.log10(p.seconds) / Math.log10(3600)) * chartWidth;
			const y = padding.top + chartHeight - ((p.power - minPower) / (maxPower - minPower)) * chartHeight;
			return { x, y };
		});

		const baseline = padding.top + chartHeight;
		let path = `M ${points[0].x} ${baseline} L ${points[0].x} ${points[0].y}`;

		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			const cpX = (prev.x + curr.x) / 2;
			path += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y}, ${cpX} ${(prev.y + curr.y) / 2}`;
		}

		const last = points[points.length - 1];
		path += ` L ${last.x} ${last.y} L ${last.x} ${baseline} Z`;

		return path;
	});

	// Data points for hover
	let dataPoints = $derived(
		peakValues
			.map((power, i) => ({
				power,
				wpkg: weight > 0 ? (power / weight).toFixed(2) : '0',
				label: durations[i].label,
				seconds: durations[i].seconds,
				x: padding.left + (Math.log10(durations[i].seconds) / Math.log10(3600)) * chartWidth,
				y: padding.top + chartHeight - ((power - minPower) / (maxPower - minPower)) * chartHeight
			}))
			.filter(p => p.power > 0)
	);

	// Y-axis ticks
	let yTicks = $derived.by(() => {
		const range = maxPower - minPower;
		const step = range > 400 ? 100 : range > 200 ? 50 : 25;
		const ticks = [];
		for (let v = Math.ceil(minPower / step) * step; v <= maxPower; v += step) {
			ticks.push(v);
		}
		return ticks;
	});

	// FTP line position
	let ftpY = $derived(padding.top + chartHeight - ((ftp - minPower) / (maxPower - minPower)) * chartHeight);
</script>

<div class="relative">
	{#if peakValues.every(v => v === 0)}
		<div class="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
			No peak power data available
		</div>
	{:else}
		<svg viewBox="0 0 {width} {height}" class="w-full" style="height: 200px;">
			<defs>
				<linearGradient id="powerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stop-color="hsl(25 95% 53%)" />
					<stop offset="50%" stop-color="hsl(45 93% 47%)" />
					<stop offset="100%" stop-color="hsl(217 91% 60%)" />
				</linearGradient>
				<linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stop-color="hsl(217 91% 60% / 0.3)" />
					<stop offset="100%" stop-color="hsl(217 91% 60% / 0.05)" />
				</linearGradient>
			</defs>

			<!-- Grid lines -->
			{#each yTicks as tick (tick)}
				{@const y = padding.top + chartHeight - ((tick - minPower) / (maxPower - minPower)) * chartHeight}
				<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity="0.1" />
				<text x={padding.left - 8} {y} text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">
					{tick}
				</text>
			{/each}

			<!-- X-axis labels -->
			{#each durations as d (d.label)}
				{@const x = padding.left + (Math.log10(d.seconds) / Math.log10(3600)) * chartWidth}
				<text {x} y={height - 10} text-anchor="middle" class="fill-muted-foreground text-[10px]">
					{d.label}
				</text>
			{/each}

			<!-- FTP reference line -->
			{#if ftp > minPower && ftp < maxPower}
				<line
					x1={padding.left}
					y1={ftpY}
					x2={width - padding.right}
					y2={ftpY}
					stroke="hsl(142 71% 45%)"
					stroke-width="1"
					stroke-dasharray="4 4"
					opacity="0.7"
				/>
				<text x={width - padding.right + 5} y={ftpY} dominant-baseline="middle" class="fill-green-500 text-[10px]">
					FTP
				</text>
			{/if}

			<!-- Area fill -->
			<path d={areaPath} fill="url(#areaGradient)" />

			<!-- Curve line -->
			<path d={curvePath} fill="none" stroke="url(#powerGradient)" stroke-width="3" stroke-linecap="round" />

			<!-- Data points -->
			{#each dataPoints as point (point.label)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					class="cursor-pointer"
					onmouseenter={() => hoveredPoint = point}
					onmouseleave={() => hoveredPoint = null}
				>
					<circle
						cx={point.x}
						cy={point.y}
						r={hoveredPoint?.label === point.label ? 7 : 5}
						fill="hsl(217 91% 60%)"
						stroke="white"
						stroke-width="2"
						class="transition-all"
					/>
				</g>
			{/each}

			<!-- Hover tooltip -->
			{#if hoveredPoint}
				{@const showBelow = hoveredPoint.y < 50}
				<g transform="translate({hoveredPoint.x}, {hoveredPoint.y + (showBelow ? 15 : -15)})">
					<rect
						x="-35"
						y={showBelow ? 2 : -28}
						width="70"
						height="26"
						rx="4"
						fill="hsl(var(--card))"
						stroke="hsl(var(--border))"
						class="drop-shadow-lg"
					/>
					<text x="0" y={showBelow ? 16 : -16} text-anchor="middle" class="fill-foreground text-[11px] font-semibold">
						{hoveredPoint.power}w
					</text>
					<text x="0" y={showBelow ? 27 : -5} text-anchor="middle" class="fill-muted-foreground text-[9px]">
						{hoveredPoint.wpkg} w/kg
					</text>
				</g>
			{/if}

			<!-- Y-axis label -->
			<text x={15} y={height / 2} text-anchor="middle" transform="rotate(-90 15 {height / 2})" class="fill-muted-foreground text-[10px]">
				Watts
			</text>
		</svg>

		<!-- Legend -->
		<div class="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
			{#each dataPoints.slice(0, 4) as point (point.label)}
				<div>
					<span class="font-medium text-foreground">{point.label}:</span>
					<span class="tabular-nums">{point.power}w</span>
					<span class="text-muted-foreground">({point.wpkg} w/kg)</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
