<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	type CalendarView = 'week' | 'month';
	type MainView = 'calendar' | 'charts' | 'race';

	interface Props {
		demoMode: boolean;
		mainView: MainView;
		calendarView: CalendarView;
		loading: boolean;
		onRefresh: () => void;
		onMainViewChange: (view: MainView) => void;
		onCalendarViewChange: (view: CalendarView) => void;
	}

	let {
		demoMode,
		mainView,
		calendarView,
		loading,
		onRefresh,
		onMainViewChange,
		onCalendarViewChange
	}: Props = $props();

	let dropdownOpen = $state(false);
</script>

<header class="flex flex-col items-center {mainView === 'race' ? 'mb-2' : 'mb-8'}">
	<!-- Centered Logo -->
	<a href="/" class="hover:opacity-80 transition-opacity">
		<img src="/logo.png" alt="spinr" class="h-44 w-auto" />
	</a>
	{#if demoMode}
		<Badge variant="secondary">Demo</Badge>
	{/if}

	<!-- Main View Tabs -->
	<div class="flex items-center gap-1 mt-4 bg-secondary/50 rounded-lg p-1">
		<button
			onclick={() => onMainViewChange('calendar')}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors {mainView === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
			Calendar
		</button>
		<button
			onclick={() => onMainViewChange('charts')}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors {mainView === 'charts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			Charts
		</button>
		<button
			onclick={() => onMainViewChange('race')}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors {mainView === 'race' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			Race Replay
		</button>
	</div>

	<!-- Calendar View Toggle (only when calendar is selected, hidden for race) -->
	{#if mainView === 'calendar'}
		<div class="relative mt-2">
			<button
				onclick={() => { dropdownOpen = !dropdownOpen; }}
				class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
			>
				{calendarView === 'week' ? 'Week' : 'Month'}
				<svg class="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if dropdownOpen}
				<div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[100px] z-50">
					<button
						onclick={() => { onCalendarViewChange('week'); dropdownOpen = false; }}
						class="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary transition-colors {calendarView === 'week' ? 'bg-secondary font-medium' : ''}"
					>
						Week
					</button>
					<button
						onclick={() => { onCalendarViewChange('month'); dropdownOpen = false; }}
						class="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary transition-colors {calendarView === 'month' ? 'bg-secondary font-medium' : ''}"
					>
						Month
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Refresh Button (hidden for race view) -->
	{#if !demoMode && mainView !== 'race'}
		<Button variant="ghost" size="icon" onclick={onRefresh} disabled={loading} class="mt-2">
			<svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</Button>
	{/if}
</header>
