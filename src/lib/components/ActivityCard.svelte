<script lang="ts">
	import type { Activity } from '$lib/types';
	import { ZONE_CONFIG } from '$lib/types';
	import { formatDuration, calculateLoad, isRace, getZoneBarWidths, trimActivityName } from '$lib/utils';

	interface Props {
		activity: Activity;
		ftp: number;
		selected?: boolean;
		compact?: boolean;
		onclick?: () => void;
	}

	let { activity, ftp, selected = false, compact = false, onclick }: Props = $props();

	const load = $derived(calculateLoad(activity, ftp));
	const zoneWidths = $derived(getZoneBarWidths(activity.timeInZones));
	const activityIsRace = $derived(isRace(activity.name));
</script>

<button
	{onclick}
	class="w-full text-left rounded-lg overflow-hidden bg-card border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow {selected ? 'ring-2 ring-primary' : ''}"
>
	<div class="flex">
		{#if activityIsRace}
			<div class="w-2 flex-shrink-0 race-checkered"></div>
		{/if}
		<div class="flex-1 min-w-0">
			<!-- Header with duration/distance -->
			<div class="bg-[hsl(217_91%_60%)] text-white px-2 {compact ? 'py-1' : 'py-1.5'}">
				<div class="flex items-center justify-between {compact ? 'text-[11px]' : 'text-xs'} font-medium">
					<span>{formatDuration(activity.duration)}</span>
					<span>{activity.distance.toFixed(compact ? 0 : 1)} km</span>
				</div>
			</div>

			<!-- Stats -->
			<div class="px-2 py-1.5 space-y-1">
				{#if compact}
					<div class="text-[11px]">
						{#if activity.avgHr}<span class="text-red-500">{activity.avgHr}bpm</span>{/if}
						<span class="text-purple-500 {activity.avgHr ? 'ml-2' : ''}">{activity.avgPower}w</span>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-x-2 text-xs">
						{#if activity.avgHr}
							<div class="flex items-center gap-1">
								<svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
								</svg>
								<span class="tabular-nums">{activity.avgHr}</span>
							</div>
						{/if}
						<div class="flex items-center gap-1">
							<svg class="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							<span class="tabular-nums">{activity.avgPower}w</span>
						</div>
					</div>
				{/if}

				<!-- Load -->
				<div class="flex items-center justify-between {compact ? 'text-[11px]' : 'text-xs'}">
					<span class="text-muted-foreground">Load</span>
					<span class="font-medium tabular-nums">{load}</span>
				</div>

				<!-- Power Zone Bar -->
				{#if activity.timeInZones}
					<div class="flex h-1.5 rounded-full overflow-hidden bg-secondary">
						{#each ZONE_CONFIG as zone, zi (zone.key)}
							{#if zoneWidths[zi] > 0}
								<div
									class="h-full"
									style="width: {zoneWidths[zi]}%; background-color: {zone.color};"
								></div>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Activity Name -->
				<div class="{compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground truncate pt-1 border-t border-border/50">
					{trimActivityName(activity.name)}
				</div>
			</div>
		</div>
	</div>
</button>
