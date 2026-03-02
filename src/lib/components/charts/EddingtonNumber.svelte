<script lang="ts">
	import type { Activity } from '$lib/types';

	interface Props {
		activities: Activity[];
	}

	let { activities }: Props = $props();

	// Calculate Eddington number
	let eddingtonData = $derived.by(() => {
		// Get distance per day (take max if multiple rides on same day)
		const dailyDistances = new Map<string, number>();
		for (const activity of activities) {
			const existing = dailyDistances.get(activity.date) || 0;
			// Sum distances for same day (could also use max)
			dailyDistances.set(activity.date, existing + activity.distance);
		}

		// Convert to sorted array of distances (descending)
		const distances = Array.from(dailyDistances.values()).sort((a, b) => b - a);

		// Calculate Eddington number
		// E = n where you have n days with distance >= n km
		let eddington = 0;
		for (let n = 1; n <= distances.length; n++) {
			if (distances[n - 1] >= n) {
				eddington = n;
			} else {
				break;
			}
		}

		// Count rides at or above each distance for histogram
		const histogram: { distance: number; count: number }[] = [];
		const bucketSize = 10; // 10km buckets
		const maxDist = Math.max(...distances, 100);
		const numBuckets = Math.ceil(maxDist / bucketSize);

		for (let i = 0; i < numBuckets; i++) {
			const minDist = i * bucketSize;
			const count = distances.filter(d => d >= minDist && d < minDist + bucketSize).length;
			histogram.push({ distance: minDist + bucketSize / 2, count });
		}

		// Calculate progress to next E
		const nextE = eddington + 1;
		const ridesAtNextE = distances.filter(d => d >= nextE).length;
		const ridesNeeded = nextE - ridesAtNextE;

		// Calculate contribution rides (rides that count toward current E)
		const contributingRides = distances.filter(d => d >= eddington).length;

		return {
			eddington,
			nextE,
			ridesAtNextE,
			ridesNeeded,
			contributingRides,
			histogram,
			totalRides: distances.length
		};
	});

	// SVG dimensions
	const width = 500;
	const height = 140;
	const padding = { top: 10, right: 20, bottom: 30, left: 40 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	let maxCount = $derived(Math.max(...eddingtonData.histogram.map(h => h.count), 10));
	let maxDistance = $derived(Math.max(...eddingtonData.histogram.map(h => h.distance + 5), 100));

	function getX(distance: number): number {
		return padding.left + (distance / maxDistance) * chartWidth;
	}

	let barWidth = $derived(Math.max(8, (chartWidth / eddingtonData.histogram.length) * 0.7));
</script>

<div class="space-y-4">
	<!-- Main Eddington Display -->
	<div class="flex items-center justify-center gap-8">
		<div class="text-center">
			<div class="text-5xl font-bold text-primary tabular-nums">{eddingtonData.eddington}</div>
			<div class="text-sm text-muted-foreground mt-1">Eddington Number</div>
		</div>

		<div class="h-16 w-px bg-border"></div>

		<div class="text-left space-y-1">
			<div class="text-sm">
				<span class="text-muted-foreground">Progress to E={eddingtonData.nextE}:</span>
				<span class="font-medium ml-2 tabular-nums">{eddingtonData.ridesAtNextE}/{eddingtonData.nextE} rides</span>
			</div>
			<div class="w-48 h-2 bg-secondary rounded-full overflow-hidden">
				<div
					class="h-full bg-primary rounded-full transition-all"
					style="width: {(eddingtonData.ridesAtNextE / eddingtonData.nextE) * 100}%"
				></div>
			</div>
			<div class="text-xs text-muted-foreground">
				Need <span class="font-medium text-foreground">{eddingtonData.ridesNeeded}</span> more {eddingtonData.ridesNeeded === 1 ? 'ride' : 'rides'} of {eddingtonData.nextE}+ km
			</div>
		</div>
	</div>

	<!-- Histogram -->
	<svg viewBox="0 0 {width} {height}" class="w-full" style="height: {height}px;">
		<!-- Grid lines -->
		{#each [0, 0.25, 0.5, 0.75, 1] as pct (pct)}
			{@const y = padding.top + chartHeight * (1 - pct)}
			{@const value = Math.round(maxCount * pct)}
			<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity="0.1" />
			{#if pct > 0}
				<text x={padding.left - 8} {y} text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[10px]">
					{value}
				</text>
			{/if}
		{/each}

		<!-- Eddington line -->
		<line
			x1={getX(eddingtonData.eddington)}
			y1={padding.top}
			x2={getX(eddingtonData.eddington)}
			y2={padding.top + chartHeight}
			stroke="hsl(217 91% 60%)"
			stroke-width="2"
			stroke-dasharray="6 4"
		/>
		<text x={getX(eddingtonData.eddington)} y={padding.top - 2} text-anchor="middle" class="fill-primary text-[10px] font-medium">
			E={eddingtonData.eddington}
		</text>

		<!-- Bars -->
		{#each eddingtonData.histogram as { distance, count } (distance)}
			{@const x = getX(distance) - barWidth / 2}
			{@const barHeight = (count / maxCount) * chartHeight}
			{@const y = padding.top + chartHeight - barHeight}
			{@const isAboveE = distance >= eddingtonData.eddington}
			<rect
				{x}
				{y}
				width={barWidth}
				height={barHeight}
				rx="2"
				fill={isAboveE ? 'hsl(217 91% 60%)' : 'hsl(217 91% 60% / 0.4)'}
			/>
		{/each}

		<!-- X-axis labels -->
		{#each [0, 25, 50, 75, 100, 125, 150] as dist (dist)}
			{#if dist <= maxDistance}
				<text x={getX(dist)} y={height - 8} text-anchor="middle" class="fill-muted-foreground text-[10px]">
					{dist}
				</text>
			{/if}
		{/each}

		<!-- Axis labels -->
		<text x={width / 2} y={height - 2} text-anchor="middle" class="fill-muted-foreground text-[9px]">
			Distance (km)
		</text>
		<text x={10} y={height / 2} text-anchor="middle" transform="rotate(-90 10 {height / 2})" class="fill-muted-foreground text-[9px]">
			Rides
		</text>
	</svg>
</div>
