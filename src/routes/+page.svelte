<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import Header from '$lib/components/Header.svelte';
	import ActivityModal from '$lib/components/ActivityModal.svelte';
	import WeekView from '$lib/components/WeekView.svelte';
	import MonthView from '$lib/components/MonthView.svelte';
	import ChartsView from '$lib/components/ChartsView.svelte';

	import type { Activity, TimeInZones } from '$lib/types';
	import { mockActivities, mockPeaks } from '$lib/mock-data';

	type Period = 'week' | 'month' | 'year' | 'all';

	interface TrendData {
		values: number[];
		delta: number;
		deltaPct: number;
	}

	interface PersonalRecord {
		watts: number;
		date: string;
		activityName: string;
	}

	interface RideRecord {
		value: number;
		date: string;
		activityName: string;
	}

	interface Stats {
		profile: { name: string; weight: number; ftp: number; currentStreak?: number; maxStreak?: number };
		period: {
			distance: number;
			duration: number;
			elevation: number;
			rides: number;
			calories: number;
			avgPower: number;
			avgPowerPerKg: number;
			avgSpeed: number;
			maxPower?: number;
			normalizedPower?: number;
			timeInZones?: TimeInZones;
		};
		fitness: {
			ftp: number;
			ftpPerKg: number;
			zmap?: number;
			vo2max?: number;
			trainingLoad?: number;
			trends?: {
				zmap?: TrendData;
				vo2max?: TrendData;
				weight?: TrendData;
				trainingLoad?: TrendData;
				ftpPerKg?: TrendData;
			};
		};
		activities?: Activity[];
		peaks?: Record<string, number>;
		personalRecords?: Record<string, PersonalRecord>;
		rideRecords?: {
			longestDistance?: RideRecord;
			longestDuration?: RideRecord;
			mostElevation?: RideRecord;
			highestAvgSpeed?: RideRecord;
			highestTss?: RideRecord;
		};
	}

	type CalendarView = 'week' | 'month';
	type MainView = 'calendar' | 'charts';

	let username = $state('');
	let password = $state('');
	let rememberMe = $state(true);
	let period = $state<Period>('week');
	let stats = $state<Stats | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loggedIn = $state(false);
	let demoMode = $state(false);
	let darkMode = $state(false);
	let mainView = $state<MainView>('calendar');
	let calendarView = $state<CalendarView>('month');
	let calendarWeekOffset = $state(0); // 0 = current week, -1 = last week, etc.
	let calendarMonthOffset = $state(0); // 0 = current month, -1 = last month, etc.
	let selectedActivity = $state<Activity | null>(null);

	function toggleTheme() {
		darkMode = !darkMode;
		if (darkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	const STORAGE_KEY = 'spinr_credentials';
	const EXPIRY_DAYS = 30;

	onMount(() => {
		// Load theme preference
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
			darkMode = true;
			document.documentElement.classList.add('dark');
		}

		// Load saved credentials
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const { u, p, exp } = JSON.parse(atob(saved));
				if (new Date(exp) > new Date()) {
					username = u;
					password = p;
					rememberMe = true;
					fetchStats();
				} else {
					localStorage.removeItem(STORAGE_KEY);
				}
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	});

	function saveCredentials() {
		if (rememberMe) {
			const exp = new Date();
			exp.setDate(exp.getDate() + EXPIRY_DAYS);
			const data = btoa(JSON.stringify({ u: username, p: password, exp: exp.toISOString() }));
			localStorage.setItem(STORAGE_KEY, data);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	async function fetchStats() {
		loading = true;
		error = null;

		try {
			const res = await fetch('/api/stats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, period, includePeaks: true })
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			stats = data;
			loggedIn = true;
			saveCredentials();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	function logout() {
		localStorage.removeItem(STORAGE_KEY);
		username = '';
		password = '';
		stats = null;
		loggedIn = false;
		demoMode = false;
		rememberMe = false;
	}

	// Activities - use real data when logged in, mock data in demo mode
	function formatLocalDate(d: Date | string): string {
		const date = typeof d === 'string' ? new Date(d) : d;
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	let activities = $derived(demoMode ? mockActivities : (stats?.activities ?? []).map(a => ({
		id: a.id,
		name: a.name,
		date: formatLocalDate(a.date),
		distance: a.distance,
		duration: a.duration,
		elevation: a.elevation,
		avgPower: a.avgPower,
		calories: a.calories,
		world: (a as Activity & { world?: string }).world,
		avgHr: (a as Activity & { avgHr?: number }).avgHr,
		maxHr: (a as Activity & { maxHr?: number }).maxHr,
		maxPower: (a as Activity & { maxPower?: number }).maxPower,
		normalizedPower: (a as Activity & { normalizedPower?: number }).normalizedPower,
		work: (a as Activity & { work?: number }).work,
		tss: (a as Activity & { tss?: number }).tss,
		intensityFactor: (a as Activity & { intensityFactor?: number }).intensityFactor,
		elevationProfile: (a as Activity & { elevationProfile?: number[] }).elevationProfile,
		timeInZones: (a as Activity & { timeInZones?: TimeInZones }).timeInZones,
		timeInHrZones: (a as Activity & { timeInHrZones?: import('$lib/types').TimeInHrZones }).timeInHrZones,
		route: (a as Activity & { world?: string }).world || ''
	})));

</script>

<div class="min-h-screen p-8">
	<!-- Top right controls (theme toggle + logout when logged in) -->
	<div class="fixed top-4 right-4 z-50 flex items-center gap-1">
		{#if loggedIn}
			<Button variant="ghost" size="icon" onclick={logout} title="Logout">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
				</svg>
			</Button>
		{/if}
		<Button variant="ghost" size="icon" onclick={toggleTheme} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
			{#if darkMode}
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
			{:else}
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
				</svg>
			{/if}
		</Button>
	</div>

	{#if !loggedIn}
		<LoginForm
			bind:username
			bind:password
			bind:rememberMe
			{error}
			{loading}
			onsubmit={fetchStats}
		/>
	{:else}
		<!-- Dashboard -->
		<div class="max-w-6xl mx-auto">
			<Header
				{demoMode}
				{mainView}
				{calendarView}
				{loading}
				onRefresh={fetchStats}
				onMainViewChange={(view) => mainView = view}
				onCalendarViewChange={(view) => calendarView = view}
			/>

			{#if stats}
				{#if mainView === 'calendar'}
					{#if calendarView === 'week'}
						<WeekView
							{activities}
							ftp={stats.fitness.ftp}
							selectedActivityId={selectedActivity?.id ?? null}
							weekOffset={calendarWeekOffset}
							onSelectActivity={(activity) => selectedActivity = activity}
							onWeekOffsetChange={(offset) => calendarWeekOffset = offset}
						/>
					{:else}
						<MonthView
							{activities}
							ftp={stats.fitness.ftp}
							selectedActivityId={selectedActivity?.id ?? null}
							monthOffset={calendarMonthOffset}
							onSelectActivity={(activity) => selectedActivity = activity}
							onMonthOffsetChange={(offset) => calendarMonthOffset = offset}
						/>
					{/if}
				{:else}
					<!-- Charts View -->
					<ChartsView
						{activities}
						ftp={stats.fitness.ftp}
						weight={stats.profile.weight}
						peaks={demoMode ? mockPeaks[period] : stats.peaks}
					/>
				{/if}

				<!-- Activity Detail Modal -->
				<ActivityModal
					activity={selectedActivity}
					ftp={stats.fitness.ftp}
					onClose={() => selectedActivity = null}
				/>
			{/if}
		</div>
	{/if}
</div>
