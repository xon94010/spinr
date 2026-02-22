<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ActivityCard from './ActivityCard.svelte';
	import type { Activity } from '$lib/types';
	import { formatDuration, calculateLoad } from '$lib/utils';

	interface Props {
		activities: Activity[];
		ftp: number;
		selectedActivityId: string | null;
		weekOffset: number;
		onSelectActivity: (activity: Activity | null) => void;
		onWeekOffsetChange: (offset: number) => void;
	}

	let {
		activities,
		ftp,
		selectedActivityId,
		weekOffset,
		onSelectActivity,
		onWeekOffsetChange
	}: Props = $props();

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function getWeekDays(offset: number): Date[] {
		const today = new Date();
		const dayOfWeek = today.getDay();
		const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

		const monday = new Date(today);
		monday.setDate(today.getDate() + mondayOffset + (offset * 7));
		monday.setHours(0, 0, 0, 0);

		const days: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(monday);
			day.setDate(monday.getDate() + i);
			days.push(day);
		}
		return days;
	}

	function getWeekNumber(date: Date): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	}

	function getActivitiesForDay(date: Date): Activity[] {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const dateStr = `${year}-${month}-${day}`;
		return activities.filter(a => a.date === dateStr);
	}

	let weekDays = $derived(getWeekDays(weekOffset));
	let weekStart = $derived(weekDays[0]);
	let weekEnd = $derived(weekDays[6]);

	let weekActivities = $derived(weekDays.flatMap(d => getActivitiesForDay(d)));
	let weekDistance = $derived(weekActivities.reduce((sum, a) => sum + a.distance, 0));
	let weekDuration = $derived(weekActivities.reduce((sum, a) => sum + a.duration, 0));
	let weekElevation = $derived(weekActivities.reduce((sum, a) => sum + a.elevation, 0));
	let weekLoad = $derived(weekActivities.reduce((sum, a) => sum + (a.tss ?? calculateLoad(a, ftp)), 0));
	let weekCalories = $derived(weekActivities.reduce((sum, a) => sum + a.calories, 0));
	let weekAvgPower = $derived(
		weekDuration > 0
			? Math.round(weekActivities.reduce((sum, a) => sum + a.avgPower * a.duration, 0) / weekDuration)
			: 0
	);
</script>

<div class="space-y-4">
	<!-- Week Navigation -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Button variant="outline" size="icon" onclick={() => onWeekOffsetChange(weekOffset - 1)}>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</Button>
			<Button variant="outline" size="icon" onclick={() => onWeekOffsetChange(weekOffset + 1)} disabled={weekOffset >= 0}>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</Button>
			<Button variant="ghost" size="sm" onclick={() => onWeekOffsetChange(0)} disabled={weekOffset === 0}>
				Today
			</Button>
		</div>
		<div class="text-sm font-medium">
			Week {getWeekNumber(weekStart)} · {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
		</div>
	</div>

	<!-- Weekly Summary (Top, Centered) -->
	{#if weekActivities.length > 0}
		<div class="flex justify-center">
			<div class="flex items-center gap-6 text-sm bg-secondary/30 rounded-lg px-6 py-3">
				<div>
					<span class="font-semibold tabular-nums">{weekActivities.length}</span>
					<span class="text-muted-foreground ml-1">rides</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{formatDuration(weekDuration)}</span>
					<span class="text-muted-foreground ml-1">time</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{weekDistance.toFixed(1)}</span>
					<span class="text-muted-foreground ml-1">km</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{weekElevation.toLocaleString()}</span>
					<span class="text-muted-foreground ml-1">m</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{weekLoad}</span>
					<span class="text-muted-foreground ml-1">Load</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{weekCalories.toLocaleString()}</span>
					<span class="text-muted-foreground ml-1">kcal</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{weekAvgPower}</span>
					<span class="text-muted-foreground ml-1">w avg</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Weekly Grid -->
	<div class="grid grid-cols-7 gap-2">
		{#each weekDays as day, i (day.getTime())}
			{@const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`}
			{@const dayActivities = activities.filter(a => a.date === dateStr)}
			{@const isToday = day.toDateString() === new Date().toDateString()}
			{@const isFuture = day > new Date()}
			{@const isRestDay = dayActivities.length === 0 && !isFuture && !isToday}
			<div class="min-h-[200px] rounded-lg relative {isRestDay ? 'bg-muted/30' : ''}">
				<!-- Day Header -->
				<div class="text-center mb-2 pb-2 border-b border-border {isToday ? 'bg-primary/10 -mx-1 px-1 rounded-t' : ''}">
					<div class="text-xs text-muted-foreground uppercase">{dayNames[i]}</div>
					<div class="text-lg font-semibold {isToday ? 'text-primary' : ''}">{day.getDate()}</div>
				</div>

				<!-- Activities for this day -->
				<div class="space-y-2">
					{#each dayActivities as activity (activity.id)}
						<ActivityCard
							{activity}
							{ftp}
							selected={selectedActivityId === activity.id}
							onclick={() => onSelectActivity(selectedActivityId === activity.id ? null : activity)}
						/>
					{/each}
					{#if isRestDay}
						<svg class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
							<line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(150,150,150,0.3)" stroke-width="1" />
						</svg>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
