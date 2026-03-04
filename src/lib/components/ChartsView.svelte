<script lang="ts">
	import PowerCurve from './charts/PowerCurve.svelte';
	import WeeklyLoad from './charts/WeeklyLoad.svelte';
	import FitnessChart from './charts/FitnessChart.svelte';
	import CumulativeDistance from './charts/CumulativeDistance.svelte';
	import EddingtonNumber from './charts/EddingtonNumber.svelte';
	import WeightChart from './charts/WeightChart.svelte';
	import ZoneBreakdown from './ZoneBreakdown.svelte';
	import type { Activity } from '$lib/types';
	import { aggregateZones, aggregateHrZones, getMaxHrFromActivities } from '$lib/utils';

	interface Props {
		activities: Activity[];
		ftp: number;
		weight: number;
		peaks?: Record<string, number>;
	}

	let { activities, ftp, weight, peaks }: Props = $props();

	type Period = '4w' | '3m' | '1y' | 'all';
	let period = $state<Period>('3m');

	const periodDays: Record<Period, number> = {
		'4w': 28,
		'3m': 90,
		'1y': 365,
		'all': 9999
	};

	let filteredActivities = $derived.by(() => {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - periodDays[period]);
		return activities.filter(a => new Date(a.date) >= cutoff);
	});

	// Aggregate zones from filtered activities using utility functions
	let aggregatedZones = $derived(aggregateZones(filteredActivities));
	let aggregatedHrZones = $derived(aggregateHrZones(filteredActivities));
	let derivedMaxHr = $derived(getMaxHrFromActivities(filteredActivities));
</script>

<div class="space-y-6">
	<!-- Period Selector -->
	<div class="flex justify-end">
		<div class="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
			{#each [['4w', '4 Weeks'], ['3m', '3 Months'], ['1y', '1 Year'], ['all', 'All Time']] as [value, label] (value)}
				<button
					onclick={() => period = value as Period}
					class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors {period === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Charts Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Power Duration Curve -->
		<div class="bg-card rounded-lg border border-border p-4">
			<h3 class="text-sm font-medium mb-4">Power Duration Curve</h3>
			<PowerCurve activities={filteredActivities} {ftp} {weight} {peaks} />
		</div>

		<!-- Weekly Training Load -->
		<div class="bg-card rounded-lg border border-border p-4">
			<h3 class="text-sm font-medium mb-4">Weekly Training Load</h3>
			<WeeklyLoad activities={filteredActivities} {ftp} />
		</div>
	</div>

	<!-- Fitness Chart (Full Width) -->
	<div class="bg-card rounded-lg border border-border p-4">
		<h3 class="text-sm font-medium mb-4">Fitness & Form</h3>
		<FitnessChart activities={filteredActivities} {ftp} />
	</div>

	<!-- Cumulative Distance & Eddington Number -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-card rounded-lg border border-border p-4">
			<h3 class="text-sm font-medium mb-4">Cumulative Distance</h3>
			<CumulativeDistance {activities} />
		</div>

		<div class="bg-card rounded-lg border border-border p-4">
			<h3 class="text-sm font-medium mb-4">Eddington Number</h3>
			<EddingtonNumber {activities} />
		</div>
	</div>

	<!-- Weight Chart -->
	<div class="bg-card rounded-lg border border-border p-4">
		<h3 class="text-sm font-medium mb-4">Weight</h3>
		<WeightChart activities={filteredActivities} />
	</div>

	<!-- Power & HR Zone Distribution -->
	{#if aggregatedZones}
		<ZoneBreakdown
			zones={aggregatedZones}
			hrZones={aggregatedHrZones}
			{ftp}
			maxHr={derivedMaxHr}
		/>
	{/if}
</div>
