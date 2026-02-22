<script lang="ts">
	import type { TimeInZones, TimeInHrZones } from '$lib/types';
	import { ZONE_CONFIG, HR_ZONE_CONFIG } from '$lib/types';
	import { formatDuration, formatZoneTime } from '$lib/utils';

	interface Props {
		zones: TimeInZones;
		hrZones?: TimeInHrZones | null;
		ftp?: number;
		maxHr?: number;
	}

	let { zones, hrZones = null, ftp = 200, maxHr = 190 }: Props = $props();

	let zoneView = $state<'power' | 'hr'>('power');

	const hasHrZones = $derived(hrZones != null);

	// Power zone ranges (% of FTP)
	const powerZoneRanges = [
		{ min: 0, max: 0.55 },      // Z1: 0-55%
		{ min: 0.55, max: 0.75 },   // Z2: 55-75%
		{ min: 0.75, max: 0.90 },   // Z3: 75-90%
		{ min: 0.90, max: 1.05 },   // Z4: 90-105%
		{ min: 1.05, max: 1.20 },   // Z5: 105-120%
		{ min: 1.20, max: 1.50 },   // Z6: 120-150%
		{ min: 1.50, max: null },   // Z7: 150%+
	];

	// HR zone ranges (% of LTHR, where LTHR ≈ 93% of Max HR)
	// Displayed as actual BPM based on maxHr - use $derived for reactivity
	let lthr = $derived(maxHr * 0.93);
	let hrZoneRanges = $derived([
		{ min: 0, max: lthr * 0.81 },         // Z1: <81% LTHR
		{ min: lthr * 0.81, max: lthr * 0.90 }, // Z2: 81-89% LTHR
		{ min: lthr * 0.90, max: lthr * 0.94 }, // Z3: 90-93% LTHR
		{ min: lthr * 0.94, max: lthr * 1.00 }, // Z4: 94-99% LTHR
		{ min: lthr * 1.00, max: lthr * 1.03 }, // Z5: 100-102% LTHR
		{ min: lthr * 1.03, max: lthr * 1.06 }, // Z6: 103-105% LTHR
		{ min: lthr * 1.06, max: null },        // Z7: >106% LTHR
	]);

	function getPowerRange(index: number): string {
		const range = powerZoneRanges[index];
		const minW = Math.round(range.min * ftp);
		if (range.max === null) {
			return `${minW}+w`;
		}
		const maxW = Math.round(range.max * ftp);
		return `${minW}-${maxW}w`;
	}

	function getHrRange(index: number): string {
		const range = hrZoneRanges[index];
		const minBpm = Math.round(range.min);
		if (range.max === null) {
			return `${minBpm}+`;
		}
		const maxBpm = Math.round(range.max);
		return `${minBpm}-${maxBpm}`;
	}

	const powerTotalTime = $derived(
		zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7
	);
	const powerMaxZoneTime = $derived(
		Math.max(zones.z1, zones.z2, zones.z3, zones.z4, zones.z5, zones.z6, zones.z7)
	);

	const hrTotalTime = $derived(
		hrZones ? hrZones.z1 + hrZones.z2 + hrZones.z3 + hrZones.z4 + hrZones.z5 + hrZones.z6 + hrZones.z7 : 0
	);
	const hrMaxZoneTime = $derived(
		hrZones ? Math.max(hrZones.z1, hrZones.z2, hrZones.z3, hrZones.z4, hrZones.z5, hrZones.z6, hrZones.z7) : 0
	);
</script>

<div class="p-4 bg-card rounded-lg border border-border">
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-2">
			{#if hasHrZones}
				<button
					onclick={() => zoneView = 'power'}
					class="text-sm font-medium px-2 py-0.5 rounded {zoneView === 'power' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					Power
				</button>
				<button
					onclick={() => zoneView = 'hr'}
					class="text-sm font-medium px-2 py-0.5 rounded {zoneView === 'hr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					Heart Rate
				</button>
			{:else}
				<h3 class="text-sm font-medium">Power Zones</h3>
			{/if}
		</div>
		<span class="text-xs text-muted-foreground">
			Total: {formatDuration(zoneView === 'power' ? powerTotalTime : hrTotalTime)}
		</span>
	</div>

	{#if zoneView === 'power'}
		<div class="space-y-2">
			{#each ZONE_CONFIG as zone, i (zone.key)}
				{@const time = zones[zone.key as keyof TimeInZones]}
				{@const pct = powerMaxZoneTime > 0 ? (time / powerMaxZoneTime) * 100 : 0}
				{@const timePct = powerTotalTime > 0 ? Math.round((time / powerTotalTime) * 100) : 0}
				<div class="flex items-center gap-3">
					<span class="text-xs font-medium w-6 shrink-0" style="color: {zone.color}">{zone.label}</span>
					<span class="text-xs text-muted-foreground tabular-nums w-16 shrink-0">{getPowerRange(i)}</span>
					<div class="flex-1 h-5 bg-secondary rounded overflow-hidden">
						<div class="h-full rounded transition-all" style="width: {pct}%; background-color: {zone.color};"></div>
					</div>
					<span class="text-xs text-muted-foreground tabular-nums w-14 text-right shrink-0">
						{time > 0 ? formatZoneTime(time) : '-'}
					</span>
					<span class="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
						{timePct > 0 ? `${timePct}%` : ''}
					</span>
				</div>
			{/each}
		</div>
	{:else if hrZones}
		<div class="space-y-2">
			{#each HR_ZONE_CONFIG as zone, i (zone.key)}
				{@const time = hrZones[zone.key as keyof TimeInHrZones]}
				{@const pct = hrMaxZoneTime > 0 ? (time / hrMaxZoneTime) * 100 : 0}
				{@const timePct = hrTotalTime > 0 ? Math.round((time / hrTotalTime) * 100) : 0}
				<div class="flex items-center gap-3">
					<span class="text-xs font-medium w-6 shrink-0" style="color: {zone.color}">{zone.label}</span>
					<span class="text-xs text-muted-foreground tabular-nums w-16 shrink-0">{getHrRange(i)}bpm</span>
					<div class="flex-1 h-5 bg-secondary rounded overflow-hidden">
						<div class="h-full rounded transition-all" style="width: {pct}%; background-color: {zone.color};"></div>
					</div>
					<span class="text-xs text-muted-foreground tabular-nums w-14 text-right shrink-0">
						{time > 0 ? formatZoneTime(time) : '-'}
					</span>
					<span class="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
						{timePct > 0 ? `${timePct}%` : ''}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
