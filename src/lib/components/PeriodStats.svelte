<script lang="ts">
	import { formatDuration } from '$lib/utils';

	interface Props {
		activities: number;
		distance: number;
		duration: number;
		elevation: number;
		calories: number;
		load: number;
		avgPower: number;
	}

	let { activities, distance, duration, elevation, calories, load, avgPower }: Props = $props();
</script>

<div class="p-4 bg-card rounded-lg border border-border">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">Activities</span>
			<span class="font-semibold tabular-nums">{activities}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">Distance</span>
			<span class="font-semibold tabular-nums">{distance}<span class="text-muted-foreground font-normal ml-0.5">km</span></span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">Duration</span>
			<span class="font-semibold tabular-nums">{formatDuration(duration)}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">Climbing</span>
			<span class="font-semibold tabular-nums">{elevation.toLocaleString()}<span class="text-muted-foreground font-normal ml-0.5">m</span></span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">Load</span>
			<span class="font-semibold tabular-nums">{load}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">kcal</span>
			<span class="font-semibold tabular-nums">{calories.toLocaleString()}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground">Avg Power</span>
			<span class="font-semibold tabular-nums">{avgPower}<span class="text-muted-foreground font-normal ml-0.5">w</span></span>
		</div>
	</div>
</div>
