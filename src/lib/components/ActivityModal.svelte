<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import type { Activity, TimeInZones, TimeInHrZones } from '$lib/types';
	import { ZONE_CONFIG, HR_ZONE_CONFIG } from '$lib/types';
	import { formatDuration, formatZoneTime, calculateLoad, trimActivityName } from '$lib/utils';

	interface ActivityWithDetails extends Activity {
		avgHr?: number;
		maxHr?: number;
		maxPower?: number;
		normalizedPower?: number;
		elevationProfile?: number[];
		timeInZones?: TimeInZones;
		timeInHrZones?: TimeInHrZones;
	}

	interface Props {
		activity: ActivityWithDetails | null;
		ftp: number;
		onClose: () => void;
	}

	let { activity, ftp, onClose }: Props = $props();

	let zoneView = $state<'power' | 'hr'>('power');

	const open = $derived(activity !== null);
	const load = $derived(activity ? calculateLoad(activity, ftp) : 0);
	const activityDate = $derived(activity ? new Date(activity.date + 'T00:00:00') : new Date());
	const hasHrZones = $derived(activity?.timeInHrZones != null);
	const hasPowerZones = $derived(activity?.timeInZones != null);

	function generateElevationProfile(values: number[], width: number, height: number): { linePath: string; areaPath: string; min: number; max: number } {
		if (values.length < 2) return { linePath: '', areaPath: '', min: 0, max: 0 };

		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;
		const padding = 4;

		const points = values.map((v, i) => {
			const x = (i / (values.length - 1)) * width;
			const y = padding + (height - padding * 2) - ((v - min) / range) * (height - padding * 2);
			return { x, y };
		});

		const linePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
		const linePath = `M${linePoints}`;
		const areaPath = `M0,${height} L${linePoints} L${width},${height} Z`;

		return { linePath, areaPath, min: Math.round(min), max: Math.round(max) };
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			onClose();
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		{#if activity}
			<Dialog.Header>
				<Dialog.Title class="text-xl">{trimActivityName(activity.name)}</Dialog.Title>
				<Dialog.Description>
					{activityDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
				</Dialog.Description>
			</Dialog.Header>

			<!-- Stats Grid -->
			<div class="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
				<div>
					<div class="text-lg font-semibold tabular-nums">{formatDuration(activity.duration)}</div>
					<div class="text-xs text-muted-foreground">Duration</div>
				</div>
				<div>
					<div class="text-lg font-semibold tabular-nums">{activity.distance.toFixed(1)}<span class="text-xs text-muted-foreground ml-0.5">km</span></div>
					<div class="text-xs text-muted-foreground">Distance</div>
				</div>
				<div>
					<div class="text-lg font-semibold tabular-nums">{activity.elevation}<span class="text-xs text-muted-foreground ml-0.5">m</span></div>
					<div class="text-xs text-muted-foreground">Elevation</div>
				</div>
				<div>
					<div class="text-lg font-semibold tabular-nums">{activity.avgPower}<span class="text-xs text-muted-foreground ml-0.5">w</span></div>
					<div class="text-xs text-muted-foreground">Avg Power</div>
				</div>
				{#if activity.avgHr}
					<div>
						<div class="text-lg font-semibold tabular-nums">{activity.avgHr}<span class="text-xs text-muted-foreground ml-0.5">bpm</span></div>
						<div class="text-xs text-muted-foreground">Avg HR</div>
					</div>
				{/if}
				<div>
					<div class="text-lg font-semibold tabular-nums">{load}</div>
					<div class="text-xs text-muted-foreground">Load (TSS)</div>
				</div>
				<div>
					<div class="text-lg font-semibold tabular-nums">{(activity.distance / (activity.duration / 3600)).toFixed(1)}<span class="text-xs text-muted-foreground ml-0.5">km/h</span></div>
					<div class="text-xs text-muted-foreground">Avg Speed</div>
				</div>
				<div>
					<div class="text-lg font-semibold tabular-nums">{activity.calories}<span class="text-xs text-muted-foreground ml-0.5">kcal</span></div>
					<div class="text-xs text-muted-foreground">Calories</div>
				</div>
				{#if activity.normalizedPower}
					<div>
						<div class="text-lg font-semibold tabular-nums">{activity.normalizedPower}<span class="text-xs text-muted-foreground ml-0.5">w</span></div>
						<div class="text-xs text-muted-foreground">NP</div>
					</div>
				{/if}
				{#if activity.maxPower}
					<div>
						<div class="text-lg font-semibold tabular-nums">{activity.maxPower}<span class="text-xs text-muted-foreground ml-0.5">w</span></div>
						<div class="text-xs text-muted-foreground">Max Power</div>
					</div>
				{/if}
				{#if activity.maxHr}
					<div>
						<div class="text-lg font-semibold tabular-nums">{activity.maxHr}<span class="text-xs text-muted-foreground ml-0.5">bpm</span></div>
						<div class="text-xs text-muted-foreground">Max HR</div>
					</div>
				{/if}
			</div>

			<!-- Zones (Power / HR Toggle) -->
			{#if hasPowerZones || hasHrZones}
				<div class="pt-4 border-t border-border">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							{#if hasPowerZones && hasHrZones}
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
								<span class="text-sm font-medium">{hasPowerZones ? 'Power Zones' : 'HR Zones'}</span>
							{/if}
						</div>
						{#if zoneView === 'power' && activity.timeInZones}
							{@const zones = activity.timeInZones}
							{@const totalTime = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7}
							<span class="text-xs text-muted-foreground">Total: {formatDuration(totalTime)}</span>
						{:else if zoneView === 'hr' && activity.timeInHrZones}
							{@const zones = activity.timeInHrZones}
							{@const totalTime = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7}
							<span class="text-xs text-muted-foreground">Total: {formatDuration(totalTime)}</span>
						{/if}
					</div>

					{#if zoneView === 'power' && activity.timeInZones}
						{@const zones = activity.timeInZones}
						{@const totalTime = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7}
						<div class="h-6 rounded-lg overflow-hidden flex mb-2">
							{#each ZONE_CONFIG as zone (zone.key)}
								{@const time = zones[zone.key as keyof typeof zones]}
								{@const pct = totalTime > 0 ? (time / totalTime) * 100 : 0}
								{#if pct > 0}
									<div
										class="h-full flex items-center justify-center text-[10px] font-medium text-white"
										style="width: {pct}%; background-color: {zone.color}; min-width: {pct > 5 ? 'auto' : '0'}"
										title="{zone.name}: {formatZoneTime(time)} ({Math.round(pct)}%)"
									>
										{#if pct > 8}{zone.label}{/if}
									</div>
								{/if}
							{/each}
						</div>
						<div class="grid grid-cols-4 sm:grid-cols-7 gap-2 text-xs">
							{#each ZONE_CONFIG as zone (zone.key)}
								{@const time = zones[zone.key as keyof typeof zones]}
								{@const pct = totalTime > 0 ? Math.round((time / totalTime) * 100) : 0}
								<div class="flex items-center gap-1">
									<div class="w-2 h-2 rounded-sm" style="background-color: {zone.color}"></div>
									<span class="text-muted-foreground">{zone.label}</span>
									<span class="tabular-nums">{pct}%</span>
								</div>
							{/each}
						</div>
					{:else if zoneView === 'hr' && activity.timeInHrZones}
						{@const zones = activity.timeInHrZones}
						{@const totalTime = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7}
						<div class="h-6 rounded-lg overflow-hidden flex mb-2">
							{#each HR_ZONE_CONFIG as zone (zone.key)}
								{@const time = zones[zone.key as keyof typeof zones]}
								{@const pct = totalTime > 0 ? (time / totalTime) * 100 : 0}
								{#if pct > 0}
									<div
										class="h-full flex items-center justify-center text-[10px] font-medium text-white"
										style="width: {pct}%; background-color: {zone.color}; min-width: {pct > 5 ? 'auto' : '0'}"
										title="{zone.name}: {formatZoneTime(time)} ({Math.round(pct)}%)"
									>
										{#if pct > 8}{zone.label}{/if}
									</div>
								{/if}
							{/each}
						</div>
						<div class="grid grid-cols-4 sm:grid-cols-7 gap-2 text-xs">
							{#each HR_ZONE_CONFIG as zone (zone.key)}
								{@const time = zones[zone.key as keyof typeof zones]}
								{@const pct = totalTime > 0 ? Math.round((time / totalTime) * 100) : 0}
								<div class="flex items-center gap-1">
									<div class="w-2 h-2 rounded-sm" style="background-color: {zone.color}"></div>
									<span class="text-muted-foreground">{zone.label}</span>
									<span class="tabular-nums">{pct}%</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Elevation Profile -->
			{#if activity.elevationProfile && activity.elevationProfile.length > 1}
				{@const profile = generateElevationProfile(activity.elevationProfile, 500, 80)}
				<div class="pt-4 mt-4 border-t border-border">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium">Elevation Profile</span>
						<span class="text-xs text-muted-foreground">{profile.min}m - {profile.max}m</span>
					</div>
					<svg class="w-full" style="height: 80px;" viewBox="0 0 500 80" preserveAspectRatio="none">
						<path d={profile.areaPath} fill="hsl(142 71% 45% / 0.3)" />
						<path d={profile.linePath} fill="none" stroke="hsl(142 71% 45%)" stroke-width="2" />
					</svg>
				</div>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
