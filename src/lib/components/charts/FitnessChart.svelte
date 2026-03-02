<script lang="ts">
	import type { Activity } from '$lib/types';
	import { calculateLoad } from '$lib/utils';

	interface Props {
		activities: Activity[];
		ftp: number;
	}

	let { activities, ftp }: Props = $props();

	// Calculate daily TSS and PMC metrics
	let pmcData = $derived.by(() => {
		if (activities.length === 0) return [];

		// Helper to parse date string without timezone issues
		const parseDate = (dateStr: string): Date => {
			const [year, month, day] = dateStr.split('-').map(Number);
			return new Date(year, month - 1, day);
		};

		// Helper to format date as YYYY-MM-DD
		const formatDate = (d: Date): string => {
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${dd}`;
		};

		// Get date range
		const sortedActivities = [...activities].sort((a, b) => a.date.localeCompare(b.date));
		const startDate = parseDate(sortedActivities[0].date);
		const endDate = new Date();
		endDate.setHours(0, 0, 0, 0);

		// Create daily TSS map
		const dailyTss = new Map<string, number>();
		for (const activity of activities) {
			const dateKey = activity.date;
			const existing = dailyTss.get(dateKey) || 0;
			dailyTss.set(dateKey, existing + (activity.tss ?? calculateLoad(activity, ftp)));
		}

		// Calculate CTL (42-day), ATL (7-day), and TSB
		const data: { date: Date; dateStr: string; ctl: number; atl: number; tsb: number; tss: number }[] = [];
		let ctl = 0;
		let atl = 0;

		const ctlDecay = Math.exp(-1 / 42);
		const atlDecay = Math.exp(-1 / 7);

		const currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			const dateStr = formatDate(currentDate);
			const tss = dailyTss.get(dateStr) || 0;

			// Exponential moving averages
			ctl = ctl * ctlDecay + tss * (1 - ctlDecay);
			atl = atl * atlDecay + tss * (1 - atlDecay);
			const tsb = ctl - atl;

			data.push({
				date: new Date(currentDate),
				dateStr,
				ctl: Math.round(ctl),
				atl: Math.round(atl),
				tsb: Math.round(tsb),
				tss
			});

			currentDate.setDate(currentDate.getDate() + 1);
		}

		return data;
	});

	// Sample data for display (every nth point to avoid clutter)
	let displayData = $derived.by(() => {
		if (pmcData.length <= 90) return pmcData;
		const step = Math.ceil(pmcData.length / 90);
		return pmcData.filter((_, i) => i % step === 0 || i === pmcData.length - 1);
	});

	// Get value ranges
	let maxCtl = $derived(Math.max(...pmcData.map(d => d.ctl), 50));
	let maxAtl = $derived(Math.max(...pmcData.map(d => d.atl), 50));
	let minTsb = $derived(Math.min(...pmcData.map(d => d.tsb), -20));
	let maxTsb = $derived(Math.max(...pmcData.map(d => d.tsb), 20));
	let maxY = $derived(Math.max(maxCtl, maxAtl, maxTsb + 20));
	let minY = $derived(Math.min(0, minTsb - 10));

	// SVG dimensions
	const width = 800;
	const height = 220;
	const padding = { top: 20, right: 80, bottom: 40, left: 50 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	function getX(index: number): number {
		return padding.left + (index / (displayData.length - 1)) * chartWidth;
	}

	function getY(value: number): number {
		return padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;
	}

	// Generate line paths
	function generatePath(values: number[]): string {
		if (values.length < 2) return '';
		return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ');
	}

	let ctlPath = $derived(generatePath(displayData.map(d => d.ctl)));
	let atlPath = $derived(generatePath(displayData.map(d => d.atl)));
	let tsbPath = $derived(generatePath(displayData.map(d => d.tsb)));

	// Area between CTL and ATL
	let areaPath = $derived.by(() => {
		if (displayData.length < 2) return '';
		const ctlPoints = displayData.map((d, i) => `${getX(i)},${getY(d.ctl)}`).join(' L');
		const atlPoints = displayData.map((d, i) => `${getX(displayData.length - 1 - i)},${getY(displayData[displayData.length - 1 - i].atl)}`).join(' L');
		return `M ${ctlPoints} L ${atlPoints} Z`;
	});

	// Current values
	let current = $derived(pmcData[pmcData.length - 1] || { ctl: 0, atl: 0, tsb: 0 });

	// X-axis date labels
	let dateLabels = $derived.by(() => {
		if (displayData.length === 0) return [];
		const count = Math.min(6, displayData.length);
		const step = Math.floor(displayData.length / count);
		return displayData
			.filter((_, idx) => idx % step === 0 || idx === displayData.length - 1)
			.map((d) => ({
				label: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
				x: getX(displayData.indexOf(d))
			}));
	});
</script>

<div class="relative">
	{#if pmcData.length < 7}
		<div class="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
			Need at least a week of data for fitness chart
		</div>
	{:else}
		<svg viewBox="0 0 {width} {height}" class="w-full" style="height: 220px;">
			<!-- Grid lines -->
			{#each [-20, 0, 20, 40, 60, 80] as value (value)}
				{#if value >= minY && value <= maxY}
					{@const y = getY(value)}
					<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity={value === 0 ? 0.3 : 0.1} />
					<text x={padding.left - 8} {y} text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">
						{value}
					</text>
				{/if}
			{/each}

			<!-- X-axis date labels -->
			{#each dateLabels as { label, x } (x)}
				<text {x} y={height - 10} text-anchor="middle" class="fill-muted-foreground text-[10px]">
					{label}
				</text>
			{/each}

			<!-- Optimal form zone (-10 to +5) -->
			{#if minY < 5 && maxY > -10}
				<rect
					x={padding.left}
					y={getY(Math.min(5, maxY))}
					width={chartWidth}
					height={getY(Math.max(-10, minY)) - getY(Math.min(5, maxY))}
					fill="hsl(142 71% 45% / 0.1)"
				/>
			{/if}

			<!-- Area between CTL and ATL -->
			<path d={areaPath} fill="hsl(217 91% 60% / 0.1)" />

			<!-- TSB line (Form) -->
			<path d={tsbPath} fill="none" stroke="hsl(142 71% 45%)" stroke-width="2" opacity="0.8" />

			<!-- ATL line (Fatigue) -->
			<path d={atlPath} fill="none" stroke="hsl(25 95% 53%)" stroke-width="2" />

			<!-- CTL line (Fitness) -->
			<path d={ctlPath} fill="none" stroke="hsl(217 91% 60%)" stroke-width="2.5" />

			<!-- Current value dots -->
			{#if displayData.length > 0}
				{@const lastIdx = displayData.length - 1}
				<circle cx={getX(lastIdx)} cy={getY(current.ctl)} r="5" fill="hsl(217 91% 60%)" stroke="white" stroke-width="2" />
				<circle cx={getX(lastIdx)} cy={getY(current.atl)} r="4" fill="hsl(25 95% 53%)" stroke="white" stroke-width="2" />
				<circle cx={getX(lastIdx)} cy={getY(current.tsb)} r="4" fill="hsl(142 71% 45%)" stroke="white" stroke-width="2" />
			{/if}

			<!-- Legend -->
			<g transform="translate({width - padding.right + 10}, {padding.top})">
				<circle cx="6" cy="0" r="5" fill="hsl(217 91% 60%)" />
				<text x="16" y="0" dominant-baseline="middle" class="fill-foreground text-[11px] font-medium">Fitness</text>
				<text x="16" y="14" class="fill-muted-foreground text-[10px]">{current.ctl}</text>

				<circle cx="6" cy="40" r="4" fill="hsl(25 95% 53%)" />
				<text x="16" y="40" dominant-baseline="middle" class="fill-foreground text-[11px] font-medium">Fatigue</text>
				<text x="16" y="54" class="fill-muted-foreground text-[10px]">{current.atl}</text>

				<circle cx="6" cy="80" r="4" fill="hsl(142 71% 45%)" />
				<text x="16" y="80" dominant-baseline="middle" class="fill-foreground text-[11px] font-medium">Form</text>
				<text x="16" y="94" class="fill-muted-foreground text-[10px] {current.tsb >= 0 ? 'fill-green-500' : 'fill-red-500'}">{current.tsb > 0 ? '+' : ''}{current.tsb}</text>
			</g>
		</svg>

		<!-- Summary -->
		<div class="flex justify-center gap-8 mt-2 text-xs">
			<div class="text-center">
				<div class="text-muted-foreground">Fitness (CTL)</div>
				<div class="text-lg font-semibold text-blue-500 tabular-nums">{current.ctl}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground">Fatigue (ATL)</div>
				<div class="text-lg font-semibold text-orange-500 tabular-nums">{current.atl}</div>
			</div>
			<div class="text-center">
				<div class="text-muted-foreground">Form (TSB)</div>
				<div class="text-lg font-semibold tabular-nums {current.tsb >= 0 ? 'text-green-500' : 'text-red-500'}">
					{current.tsb > 0 ? '+' : ''}{current.tsb}
				</div>
			</div>
		</div>
	{/if}
</div>
