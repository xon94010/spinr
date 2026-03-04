<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ActivityCard from './ActivityCard.svelte';
	import type { Activity } from '$lib/types';
	import { formatDuration, calculateLoad, getWeekNumber } from '$lib/utils';

	interface Props {
		activities: Activity[];
		ftp: number;
		selectedActivityId: string | null;
		monthOffset: number;
		onSelectActivity: (activity: Activity | null) => void;
		onMonthOffsetChange: (offset: number) => void;
	}

	let {
		activities,
		ftp,
		selectedActivityId,
		monthOffset,
		onSelectActivity,
		onMonthOffsetChange
	}: Props = $props();

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function getMonthDays(offset: number): { date: Date; isCurrentMonth: boolean }[] {
		const today = new Date();
		const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
		const year = targetMonth.getFullYear();
		const month = targetMonth.getMonth();

		const firstDay = new Date(year, month, 1);
		const startDayOfWeek = firstDay.getDay();
		const mondayOffset = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
		const startDate = new Date(firstDay);
		startDate.setDate(firstDay.getDate() + mondayOffset);

		const days: { date: Date; isCurrentMonth: boolean }[] = [];
		for (let i = 0; i < 42; i++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + i);
			days.push({
				date,
				isCurrentMonth: date.getMonth() === month
			});
		}
		return days;
	}

	function getMonthName(offset: number): string {
		const today = new Date();
		const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
		return targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	function getActivitiesForDay(date: Date): Activity[] {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const dateStr = `${year}-${month}-${day}`;
		return activities.filter(a => a.date === dateStr);
	}

	let monthDays = $derived(getMonthDays(monthOffset));
	let currentMonthName = $derived(getMonthName(monthOffset));

	let monthSummary = $derived.by(() => {
		const acts = monthDays
			.filter(d => d.isCurrentMonth)
			.flatMap(d => getActivitiesForDay(d.date));
		let distance = 0, duration = 0, elevation = 0, load = 0, calories = 0, powerDuration = 0;
		const weights: number[] = [];
		for (const a of acts) {
			distance += a.distance;
			duration += a.duration;
			elevation += a.elevation;
			load += a.tss ?? calculateLoad(a, ftp);
			calories += a.calories;
			powerDuration += a.avgPower * a.duration;
			if (a.weight) weights.push(a.weight);
		}
		const avgWeight = weights.length > 0 ? Math.round(weights.reduce((s, w) => s + w, 0) / weights.length * 10) / 10 : undefined;
		return {
			activities: acts,
			distance,
			duration,
			elevation,
			load,
			calories,
			avgPower: duration > 0 ? Math.round(powerDuration / duration) : 0,
			avgWeight
		};
	});
</script>

<div class="overflow-x-auto">
	<!-- Month Navigation -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<Button variant="outline" size="icon" onclick={() => onMonthOffsetChange(monthOffset - 1)}>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</Button>
			<Button variant="outline" size="icon" onclick={() => onMonthOffsetChange(monthOffset + 1)} disabled={monthOffset >= 0}>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</Button>
			<Button variant="ghost" size="sm" onclick={() => onMonthOffsetChange(0)} disabled={monthOffset === 0}>
				Today
			</Button>
		</div>
		<div class="text-lg font-semibold">
			{currentMonthName}
		</div>
	</div>

	<!-- Monthly Summary (Top, Centered) -->
	{#if monthSummary.activities.length > 0}
		<div class="flex justify-center mb-4">
			<div class="flex items-center gap-6 text-sm bg-secondary/30 rounded-lg px-6 py-3">
				<div>
					<span class="font-semibold tabular-nums">{monthSummary.activities.length}</span>
					<span class="text-muted-foreground ml-1">rides</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{formatDuration(monthSummary.duration)}</span>
					<span class="text-muted-foreground ml-1">time</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{monthSummary.distance.toFixed(1)}</span>
					<span class="text-muted-foreground ml-1">km</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{monthSummary.elevation.toLocaleString()}</span>
					<span class="text-muted-foreground ml-1">m</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{monthSummary.load}</span>
					<span class="text-muted-foreground ml-1">Load</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{monthSummary.calories.toLocaleString()}</span>
					<span class="text-muted-foreground ml-1">kcal</span>
				</div>
				<div>
					<span class="font-semibold tabular-nums">{monthSummary.avgPower}</span>
					<span class="text-muted-foreground ml-1">w avg</span>
				</div>
				{#if monthSummary.avgWeight}
					<div>
						<span class="font-semibold tabular-nums">{monthSummary.avgWeight}</span>
						<span class="text-muted-foreground ml-1">kg</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Calendar Table -->
	<table class="w-full border-collapse table-fixed" style="min-width: 1100px;">
		<!-- Header Row -->
		<thead>
			<tr class="border-b border-border">
				<th class="w-[140px] p-2 text-left"></th>
				{#each dayNames as dayName (dayName)}
					<th class="p-2 text-center text-xs font-medium text-muted-foreground uppercase">{dayName}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each [0, 1, 2, 3, 4, 5] as weekIndex (weekIndex)}
				{@const weekStartIdx = weekIndex * 7}
				{@const weekDaysSlice = monthDays.slice(weekStartIdx, weekStartIdx + 7)}
				{@const weekActivitiesAll = weekDaysSlice.flatMap(d => getActivitiesForDay(d.date))}
				{@const weekTotalDuration = weekActivitiesAll.reduce((sum, a) => sum + a.duration, 0)}
				{@const weekTotalDistance = weekActivitiesAll.reduce((sum, a) => sum + a.distance, 0)}
				{@const weekTotalElevation = weekActivitiesAll.reduce((sum, a) => sum + a.elevation, 0)}
				{@const weekTotalLoad = weekActivitiesAll.reduce((sum, a) => sum + (a.tss ?? calculateLoad(a, ftp)), 0)}
				{@const weekTotalCalories = weekActivitiesAll.reduce((sum, a) => sum + a.calories, 0)}
				{@const weekWeights = weekActivitiesAll.filter(a => a.weight).map(a => a.weight!)}
				{@const weekAvgWeight = weekWeights.length > 0 ? Math.round(weekWeights.reduce((s, w) => s + w, 0) / weekWeights.length * 10) / 10 : undefined}
				{@const hasAnyCurrentMonth = weekDaysSlice.some(d => d.isCurrentMonth)}
				{#if hasAnyCurrentMonth}
					<tr class="border-b border-border align-top">
						<!-- Week Summary Sidebar -->
						<td class="p-3 bg-secondary/30 border-r border-border">
							<div class="text-xs font-medium text-muted-foreground mb-2">
								Week {getWeekNumber(weekDaysSlice[0].date)}
							</div>
							<div class="space-y-1 text-xs">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Total</span>
									<span class="font-medium tabular-nums">{formatDuration(weekTotalDuration)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Distance</span>
									<span class="font-medium tabular-nums">{weekTotalDistance.toFixed(0)} km</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Elevation</span>
									<span class="font-medium tabular-nums">{weekTotalElevation.toLocaleString()} m</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Load</span>
									<span class="font-medium tabular-nums">{weekTotalLoad}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">kcal</span>
									<span class="font-medium tabular-nums">{weekTotalCalories.toLocaleString()}</span>
								</div>
								{#if weekAvgWeight}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Weight</span>
										<span class="font-medium tabular-nums">{weekAvgWeight} kg</span>
									</div>
								{/if}
							</div>
						</td>

						<!-- Day Cells -->
						{#each weekDaysSlice as dayInfo (dayInfo.date.getTime())}
							{@const dateStr = `${dayInfo.date.getFullYear()}-${String(dayInfo.date.getMonth() + 1).padStart(2, '0')}-${String(dayInfo.date.getDate()).padStart(2, '0')}`}
							{@const dayActivities = activities.filter(a => a.date === dateStr)}
							{@const isToday = dayInfo.date.toDateString() === new Date().toDateString()}
							{@const isRestDay = dayActivities.length === 0 && dayInfo.isCurrentMonth && dayInfo.date.getTime() < Date.now() && !isToday}
							<td class="p-2 border-r border-border last:border-r-0 min-h-[160px] relative {!dayInfo.isCurrentMonth ? 'bg-muted/30' : ''} {isRestDay ? 'bg-muted/30' : ''}">
								<!-- Date Header -->
								<div class="flex items-center justify-between mb-2">
									<span class="text-xs {dayInfo.isCurrentMonth ? 'text-muted-foreground' : 'text-muted-foreground/50'}">
										{dayInfo.date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
									</span>
									{#if isToday}
										<span class="w-2 h-2 rounded-full bg-primary"></span>
									{/if}
								</div>

								<!-- Activities -->
								<div class="space-y-1.5">
									{#each dayActivities as activity (activity.id)}
										<ActivityCard
											{activity}
											{ftp}
											selected={selectedActivityId === activity.id}
											compact={true}
											onclick={() => onSelectActivity(selectedActivityId === activity.id ? null : activity)}
										/>
									{/each}
									{#if isRestDay}
										<svg class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
											<line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(150,150,150,0.3)" stroke-width="1" />
										</svg>
									{/if}
								</div>
							</td>
						{/each}
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>
