<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import Header from '$lib/components/Header.svelte';
	import ActivityModal from '$lib/components/ActivityModal.svelte';
	import WeekView from '$lib/components/WeekView.svelte';
	import MonthView from '$lib/components/MonthView.svelte';
	import ChartsView from '$lib/components/ChartsView.svelte';
	import RaceReplayView from '$lib/components/race/RaceReplayView.svelte';
	import type { Activity, TimeInZones } from '$lib/types';

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
	type MainView = 'calendar' | 'charts' | 'race';

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

	const mockStats: Record<Period, Stats> = {
		week: {
			profile: { name: 'Fred Beringer', weight: 97, ftp: 215, currentStreak: 5, maxStreak: 12 },
			period: { distance: 142, duration: 30180, elevation: 1850, rides: 5, calories: 3200, avgPower: 185, avgPowerPerKg: 1.91, avgSpeed: 28.4, maxPower: 720, normalizedPower: 195, timeInZones: { z1: 2400, z2: 10800, z3: 9000, z4: 4800, z5: 2100, z6: 840, z7: 240 } },
			fitness: {
				ftp: 215, ftpPerKg: 2.22, zmap: 285, vo2max: 48, trainingLoad: 320,
				trends: {
					ftpPerKg: { values: [2.15, 2.18, 2.20, 2.21, 2.22], delta: 0.04, deltaPct: 2 },
					zmap: { values: [270, 275, 280, 282, 285], delta: 8, deltaPct: 3 },
					vo2max: { values: [46, 46.5, 47, 47.5, 48], delta: 1.2, deltaPct: 3 },
					weight: { values: [98, 97.5, 97.2, 97, 97], delta: -0.8, deltaPct: -1 },
					trainingLoad: { values: [55, 62, 70, 68, 65], delta: 6, deltaPct: 10 }
				}
			}
		},
		month: {
			profile: { name: 'Fred Beringer', weight: 97, ftp: 215, currentStreak: 5, maxStreak: 12 },
			period: { distance: 580, duration: 123120, elevation: 7200, rides: 22, calories: 12800, avgPower: 178, avgPowerPerKg: 1.84, avgSpeed: 27.8, maxPower: 780, normalizedPower: 188, timeInZones: { z1: 9600, z2: 43200, z3: 36000, z4: 19200, z5: 8400, z6: 3360, z7: 960 } },
			fitness: {
				ftp: 215, ftpPerKg: 2.22, zmap: 285, vo2max: 48, trainingLoad: 1450,
				trends: {
					ftpPerKg: { values: [2.05, 2.08, 2.12, 2.15, 2.17, 2.19, 2.21, 2.22], delta: 0.1, deltaPct: 5 },
					zmap: { values: [265, 268, 272, 275, 278, 280, 283, 285], delta: 12, deltaPct: 5 },
					vo2max: { values: [45, 45.5, 46, 46.5, 47, 47.2, 47.8, 48], delta: 2, deltaPct: 4 },
					weight: { values: [99, 98.5, 98, 97.8, 97.5, 97.2, 97, 97], delta: -1.5, deltaPct: -2 },
					trainingLoad: { values: [58, 62, 55, 70, 68, 72, 65, 68], delta: 5, deltaPct: 8 }
				}
			}
		},
		year: {
			profile: { name: 'Fred Beringer', weight: 97, ftp: 215, currentStreak: 5, maxStreak: 12 },
			period: { distance: 6840, duration: 1447200, elevation: 89000, rides: 245, calories: 151000, avgPower: 172, avgPowerPerKg: 1.77, avgSpeed: 27.2, maxPower: 850, normalizedPower: 182, timeInZones: { z1: 115200, z2: 518400, z3: 432000, z4: 230400, z5: 100800, z6: 40320, z7: 10080 } },
			fitness: {
				ftp: 215, ftpPerKg: 2.22, zmap: 285, vo2max: 48, trainingLoad: 15200,
				trends: {
					ftpPerKg: { values: [1.85, 1.92, 2.0, 2.06, 2.12, 2.16, 2.19, 2.22], delta: 0.25, deltaPct: 13 },
					zmap: { values: [245, 252, 260, 268, 272, 278, 282, 285], delta: 25, deltaPct: 10 },
					vo2max: { values: [42, 43, 44, 45, 46, 47, 47.5, 48], delta: 4, deltaPct: 9 },
					weight: { values: [102, 101, 100, 99, 98.5, 98, 97.5, 97], delta: -3.5, deltaPct: -4 },
					trainingLoad: { values: [45, 52, 58, 62, 65, 68, 70, 72], delta: 18, deltaPct: 33 }
				}
			}
		},
		all: {
			profile: { name: 'Fred Beringer', weight: 97, ftp: 215, currentStreak: 5, maxStreak: 12 },
			period: { distance: 12500, duration: 2592000, elevation: 156000, rides: 420, calories: 278000, avgPower: 168, avgPowerPerKg: 1.73, avgSpeed: 26.8, maxPower: 890, normalizedPower: 178, timeInZones: { z1: 207360, z2: 933120, z3: 777600, z4: 414720, z5: 181440, z6: 72576, z7: 18144 } },
			fitness: {
				ftp: 215, ftpPerKg: 2.22, zmap: 285, vo2max: 48, trainingLoad: 28500,
				trends: {
					ftpPerKg: { values: [1.65, 1.78, 1.9, 2.0, 2.08, 2.14, 2.18, 2.22], delta: 0.38, deltaPct: 21 },
					zmap: { values: [220, 235, 248, 260, 270, 278, 282, 285], delta: 40, deltaPct: 16 },
					vo2max: { values: [38, 40, 42, 44, 45.5, 47, 47.5, 48], delta: 7, deltaPct: 17 },
					weight: { values: [105, 103, 101, 100, 99, 98, 97.5, 97], delta: -5, deltaPct: -5 },
					trainingLoad: { values: [35, 42, 48, 55, 62, 68, 70, 72], delta: 25, deltaPct: 53 }
				}
			}
		}
	};

	// Mock peak power data (expanded with more durations)
	const mockPeaks: Record<Period, Record<string, number>> = {
		week: { '5s': 720, '15s': 580, '30s': 450, '1m': 380, '5m': 280, '20m': 220, '60m': 195 },
		month: { '5s': 780, '15s': 620, '30s': 480, '1m': 395, '5m': 290, '20m': 225, '60m': 200 },
		year: { '5s': 850, '15s': 680, '30s': 520, '1m': 420, '5m': 305, '20m': 235, '60m': 208 },
		all: { '5s': 890, '15s': 710, '30s': 545, '1m': 445, '5m': 315, '20m': 240, '60m': 212 }
	};

	// Mock Personal Records with dates
	const mockPersonalRecords: Record<string, PersonalRecord> = {
		'5s': { watts: 890, date: '2025-12-15', activityName: 'Race: Crit City' },
		'1m': { watts: 445, date: '2026-01-22', activityName: 'Interval Session' },
		'5m': { watts: 315, date: '2026-02-01', activityName: 'FTP Test' },
		'20m': { watts: 240, date: '2026-02-01', activityName: 'FTP Test' },
		'60m': { watts: 212, date: '2025-11-08', activityName: 'Endurance Ride' }
	};

	// Mock elevation profiles for demo - simple and clean
	const mockProfiles = {
		volcano: [10, 15, 25, 40, 60, 90, 130, 180, 240, 310, 380, 440, 490, 520, 540, 550, 555, 550, 535, 510, 475, 430, 380, 320, 260, 200, 150, 110, 80, 55, 35, 25, 20, 18, 20, 25, 35, 50, 70, 95],
		flat: [10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 10, 12, 11, 10],
		hilly: [50, 80, 130, 200, 280, 340, 300, 240, 180, 140, 160, 220, 300, 400, 480, 520, 480, 400, 320, 250, 200, 180, 200, 260, 340, 420, 460, 440, 380, 300, 220, 150, 100, 70, 50, 45, 50, 60, 80, 100],
		climb: [200, 210, 230, 260, 300, 360, 440, 540, 660, 800, 950, 1100, 1250, 1380, 1500, 1600, 1680, 1740, 1780, 1800, 1790, 1760, 1700, 1620, 1520, 1400, 1270, 1130, 990, 850, 720, 600, 500, 420, 360, 320, 290, 270, 260, 250],
		crit: [15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15]
	};

	// Mock time in zones data
	const mockZones = {
		endurance: { z1: 300, z2: 2400, z3: 1800, z4: 600, z5: 200, z6: 80, z7: 20 },
		recovery: { z1: 1800, z2: 1500, z3: 240, z4: 50, z5: 10, z6: 0, z7: 0 },
		tempo: { z1: 180, z2: 1200, z3: 2400, z4: 1000, z5: 300, z6: 100, z7: 20 },
		intervals: { z1: 300, z2: 600, z3: 900, z4: 1200, z5: 900, z6: 480, z7: 120 },
		race: { z1: 60, z2: 180, z3: 360, z4: 720, z5: 840, z6: 420, z7: 120 },
		climb: { z1: 200, z2: 1800, z3: 3600, z4: 3000, z5: 1500, z6: 500, z7: 200 }
	};

	// Mock HR zones (7 zones based on LTHR, similar to Intervals.icu)
	// LTHR ≈ 93% of Max HR (~181 for max 195). Zone thresholds: Z1<147, Z2<163, Z3<170, Z4<181, Z5<186, Z6<192, Z7>192
	const mockHrZones = {
		endurance: { z1: 2000, z2: 2400, z3: 800, z4: 200, z5: 0, z6: 0, z7: 0 },       // Mostly Z1/Z2
		recovery: { z1: 2800, z2: 700, z3: 100, z4: 0, z5: 0, z6: 0, z7: 0 },           // Mostly Z1
		tempo: { z1: 800, z2: 1800, z3: 1600, z4: 800, z5: 100, z6: 50, z7: 0 },        // Mostly Z2/Z3
		intervals: { z1: 600, z2: 1200, z3: 1000, z4: 1200, z5: 300, z6: 150, z7: 50 }, // Mix with some Z5/Z6
		race: { z1: 200, z2: 400, z3: 600, z4: 1000, z5: 300, z6: 150, z7: 50 },        // Higher intensity
		climb: { z1: 1500, z2: 4000, z3: 3000, z4: 2000, z5: 200, z6: 80, z7: 20 }      // Long sustained effort
	};

	// Mock activities data
	// Generate mock activity dates relative to today
	function getMockDate(daysAgo: number): string {
		const date = new Date();
		date.setDate(date.getDate() - daysAgo);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	const mockActivities = [
		{ id: '0', name: 'Easy Recovery', date: getMockDate(0), distance: 14.2, duration: 2460, elevation: 85, avgPower: 125, maxPower: 280, normalizedPower: 132, work: 307, tss: 18, intensityFactor: 0.66, avgHr: 115, maxHr: 135, calories: 280, world: 'Watopia', route: 'Flat Route', elevationProfile: mockProfiles.flat, timeInZones: mockZones.recovery, timeInHrZones: mockHrZones.recovery },
		{ id: '1', name: 'Morning Ride', date: getMockDate(1), distance: 42.5, duration: 5400, elevation: 520, avgPower: 195, maxPower: 680, normalizedPower: 208, work: 1053, tss: 65, intensityFactor: 0.82, avgHr: 142, maxHr: 175, calories: 820, world: 'Watopia', route: 'Volcano Circuit', elevationProfile: mockProfiles.volcano, timeInZones: mockZones.tempo, timeInHrZones: mockHrZones.tempo },
		{ id: '2', name: 'Recovery Spin', date: getMockDate(2), distance: 25.2, duration: 3600, elevation: 180, avgPower: 145, maxPower: 320, normalizedPower: 152, work: 522, tss: 28, intensityFactor: 0.72, avgHr: 118, maxHr: 138, calories: 420, world: 'Watopia', route: 'Tempus Fugit', elevationProfile: mockProfiles.flat, timeInZones: mockZones.recovery, timeInHrZones: mockHrZones.recovery },
		{ id: '3', name: 'Group Ride', date: getMockDate(3), distance: 58.8, duration: 7200, elevation: 780, avgPower: 178, maxPower: 720, normalizedPower: 192, work: 1282, tss: 74, intensityFactor: 0.78, avgHr: 148, maxHr: 182, calories: 1150, world: 'Watopia', route: 'Pretzel', elevationProfile: mockProfiles.hilly, timeInZones: mockZones.endurance, timeInHrZones: mockHrZones.endurance },
		{ id: '4', name: 'Interval Session', date: getMockDate(4), distance: 32.1, duration: 4500, elevation: 420, avgPower: 205, maxPower: 850, normalizedPower: 235, work: 923, tss: 69, intensityFactor: 0.94, avgHr: 156, maxHr: 188, calories: 780, world: 'Makuri Islands', route: 'Neokyo', elevationProfile: mockProfiles.hilly, timeInZones: mockZones.intervals, timeInHrZones: mockHrZones.intervals },
		{ id: '5', name: 'Endurance Ride', date: getMockDate(5), distance: 85.4, duration: 10800, elevation: 1200, avgPower: 168, maxPower: 520, normalizedPower: 178, work: 1814, tss: 95, intensityFactor: 0.71, avgHr: 138, maxHr: 162, calories: 1680, world: 'France', route: 'Ven-Top', elevationProfile: mockProfiles.climb, timeInZones: mockZones.climb, timeInHrZones: mockHrZones.climb },
		{ id: '6', name: 'Race: Crit City', date: getMockDate(7), distance: 28.5, duration: 2700, elevation: 85, avgPower: 245, maxPower: 890, normalizedPower: 268, work: 662, tss: 54, intensityFactor: 1.07, avgHr: 172, maxHr: 195, calories: 620, world: 'Crit City', route: '', elevationProfile: mockProfiles.crit, timeInZones: mockZones.race, timeInHrZones: mockHrZones.race },
		{ id: '7', name: 'Easy Spin', date: getMockDate(8), distance: 18.2, duration: 2400, elevation: 120, avgPower: 135, maxPower: 280, normalizedPower: 142, work: 324, tss: 18, intensityFactor: 0.68, avgHr: 112, maxHr: 128, calories: 310, world: 'Watopia', route: 'Flat Route', elevationProfile: mockProfiles.flat, timeInZones: mockZones.recovery, timeInHrZones: mockHrZones.recovery },
		{ id: '8', name: 'Hill Repeats', date: getMockDate(10), distance: 38.6, duration: 5100, elevation: 980, avgPower: 198, maxPower: 780, normalizedPower: 225, work: 1010, tss: 72, intensityFactor: 0.90, avgHr: 152, maxHr: 185, calories: 890, world: 'Watopia', route: 'Road to Sky', elevationProfile: mockProfiles.climb, timeInZones: mockZones.intervals, timeInHrZones: mockHrZones.intervals },
	];

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

	function enterDemo() {
		demoMode = true;
		loggedIn = true;
		stats = { ...mockStats[period], peaks: mockPeaks[period], personalRecords: mockPersonalRecords };
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

	// Weekly calendar view helpers
	function getWeekDays(weekOffset: number): Date[] {
		const today = new Date();
		const dayOfWeek = today.getDay(); // 0 = Sunday
		const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday of current week

		const monday = new Date(today);
		monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7));
		monday.setHours(0, 0, 0, 0);

		const days: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(monday);
			day.setDate(monday.getDate() + i);
			days.push(day);
		}
		return days;
	}

	let weekDays = $derived(getWeekDays(calendarWeekOffset));
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
	{:else if mainView === 'race'}
		<!-- Race Replay (full height flex layout) -->
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
		</div>
		<div class="flex-1 min-h-0" style="height: calc(100vh - 17rem);">
			<RaceReplayView {username} {password} />
		</div>
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
