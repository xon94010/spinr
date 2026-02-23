<script lang="ts">
	import { onMount } from 'svelte';
	import { getRaceStore } from '$lib/stores/race-data.svelte';
	import { getPlaybackStore } from '$lib/stores/playback.svelte';
	import { PlaybackEngine } from '$lib/engine/playback-engine';
	import { interpolateRiderAtTime } from '$lib/engine/rider-interpolator';
	import { interpolateRoute } from '$lib/route-utils';
	import { getRiderColor } from '$lib/renderer/colors';
	import type { RiderSnapshot } from '$lib/types/playback';
	import type { RaceData } from '$lib/types/race';
	import MapCanvas from './MapCanvas.svelte';
	import PlaybackControls from './PlaybackControls.svelte';
	import RiderTable from './RiderTable.svelte';
	import MiniElevationProfile from './MiniElevationProfile.svelte';
	import LoadingProgress from './LoadingProgress.svelte';

	let { username, password }: { username: string; password: string } = $props();

	const raceStore = getRaceStore();
	const playback = getPlaybackStore();

	let engine: PlaybackEngine | null = null;

	interface Activity {
		activityId: string;
		name: string;
		date: string;
		eventSubgroupId?: number;
	}

	let activities = $state<Activity[]>([]);
	let loadingActivities = $state(false);
	let fetchError = $state('');

	// Build a color map: profileId -> color
	let riderColorMap = $derived.by(() => {
		const map = new Map<number, string>();
		if (raceStore.data) {
			raceStore.data.riders.forEach((r, i) => {
				map.set(r.profileId, getRiderColor(i));
			});
		}
		return map;
	});

	function onTick(currentTime: number) {
		const data = raceStore.data;
		if (!data) return;

		playback.setCurrentTime(currentTime);
		playback.setPlaying(engine?.isPlaying() ?? false);

		const snapshots: RiderSnapshot[] = [];
		const myId = data.myProfileId;

		// Find the leader's distance to calculate distance to finish
		let leaderDistance = 0;
		for (const rider of data.riders) {
			const interp = interpolateRiderAtTime(rider, currentTime);
			if (interp && interp.distance > leaderDistance) {
				leaderDistance = interp.distance;
			}
		}

		for (const rider of data.riders) {
			const interp = interpolateRiderAtTime(rider, currentTime);
			if (!interp) continue;

			// Map distance to route position for x/y
			const pos = interpolateRoute(data.route, interp.distance);

			snapshots.push({
				riderId: rider.profileId,
				name: rider.name,
				distance: interp.distance,
				distanceToFinish: Math.max(0, data.totalDistance - interp.distance),
				power: interp.power,
				heartRate: interp.heartRate,
				speed: interp.speed,
				cadence: interp.cadence,
				altitude: interp.altitude,
				lat: pos ? pos.lat : 0,
				lng: pos ? pos.lng : 0,
				weight: rider.weight || 0,
				color: riderColorMap.get(rider.profileId) || '#888',
				isMe: rider.profileId === myId
			});
		}

		playback.updateRiders(snapshots);
	}

	function startEngine(data: RaceData) {
		engine?.destroy();
		playback.setDuration(data.totalDuration);
		engine = new PlaybackEngine(data.totalDuration, onTick);
		// Initial tick at time 0
		onTick(0);
	}

	async function fetchActivities() {
		loadingActivities = true;
		fetchError = '';
		try {
			const resp = await fetch('/api/activities', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			const data = await resp.json();
			if (resp.ok) {
				activities = data.activities || [];
			} else {
				fetchError = data.error || 'Failed to load activities';
			}
		} catch {
			fetchError = 'Failed to load activities';
		}
		loadingActivities = false;
	}

	async function loadRace(activityId: string) {
		raceStore.setLoading('Fetching race participants...');

		try {
			const raceRes = await fetch('/api/race', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, activityId })
			});

			const raceInfo = await raceRes.json();
			if (!raceRes.ok) {
				raceStore.setError(raceInfo.error || 'Failed to load race');
				return;
			}

			raceStore.setLoading(
				`Loading telemetry for ${raceInfo.participants.length} riders...`
			);

			const telRes = await fetch('/api/race/telemetry', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username,
					password,
					participants: raceInfo.participants,
					eventName: raceInfo.eventName,
					eventSubgroupId: raceInfo.eventSubgroupId,
					initiatorProfileId: raceInfo.initiatorProfileId
				})
			});

			const raceData: RaceData = await telRes.json();
			if (!telRes.ok) {
				raceStore.setError((raceData as unknown as { error: string }).error || 'Failed to load telemetry');
				return;
			}

			raceStore.setData(raceData);
			startEngine(raceData);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Unknown error';
			raceStore.setError(msg);
		}
	}

	function handleLoadActivity(activityId: string) {
		loadRace(activityId);
	}

	function handleBack() {
		engine?.destroy();
		playback.reset();
		raceStore.clear();
	}

	function handleToggle() {
		engine?.toggle();
		playback.setPlaying(engine?.isPlaying() ?? false);
	}

	function handleSeek(time: number) {
		engine?.seek(time);
	}

	function handleSpeedChange(speed: number) {
		engine?.setSpeed(speed);
		playback.setSpeed(speed);
	}

	function handleSelectRider(id: number | null) {
		playback.selectRider(id);
	}

	function handleFollowRider(id: number | null) {
		playback.followRider(id);
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString(undefined, {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}

	onMount(() => {
		fetchActivities();
		return () => {
			engine?.destroy();
			playback.reset();
			raceStore.clear();
		};
	});
</script>

{#if raceStore.loading}
	<div class="flex items-center justify-center h-full">
		<LoadingProgress message={raceStore.loadingMessage} />
	</div>
{:else if raceStore.error}
	<div class="flex flex-col items-center justify-center h-full gap-4 p-6">
		<p class="text-destructive text-lg">{raceStore.error}</p>
		<button
			onclick={handleBack}
			class="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
		>
			Back
		</button>
	</div>
{:else if raceStore.data}
	<div class="h-full flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
			<div class="flex items-center gap-3">
				<h1 class="font-semibold text-sm">{raceStore.data.eventName}</h1>
				<span class="text-xs text-muted-foreground">
					{raceStore.data.riders.length} riders
				</span>
			</div>
			<button
				onclick={handleBack}
				class="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-accent transition-colors"
			>
				Back
			</button>
		</div>

		<!-- Main content -->
		<div class="flex-1 flex overflow-hidden">
			<!-- Map (70%) -->
			<div class="flex-[7] min-w-0">
				<MapCanvas
					route={raceStore.data.route}
					riders={playback.riders}
					selectedRiderId={playback.selectedRiderId}
					followRiderId={playback.followRiderId}
					onSelectRider={handleSelectRider}
					onFollowRider={handleFollowRider}
				/>
			</div>

			<!-- Rider Table (30%) -->
			<div class="flex-[3] min-w-[250px] max-w-[350px] border-l border-border bg-card overflow-hidden">
				<RiderTable
					riders={playback.riders}
					selectedRiderId={playback.selectedRiderId}
					onSelectRider={handleSelectRider}
					onFollowRider={handleFollowRider}
				/>
			</div>
		</div>

		<!-- Elevation profile -->
		<MiniElevationProfile
			route={raceStore.data.route}
			riders={playback.riders}
			selectedRiderId={playback.selectedRiderId}
			totalDistance={raceStore.data.totalDistance}
		/>

		<!-- Playback controls -->
		<PlaybackControls
			playing={playback.playing}
			currentTime={playback.currentTime}
			duration={playback.duration}
			speed={playback.speed}
			onToggle={handleToggle}
			onSeek={handleSeek}
			onSpeedChange={handleSpeedChange}
		/>
	</div>
{:else}
	<!-- Activity selector -->
	<div class="flex flex-col items-center pt-4 h-full p-6">
		<div class="flex flex-col items-center gap-6 max-w-lg w-full">
			<div class="text-center">
				<h2 class="text-2xl font-bold tracking-tight mb-2">Race Replay</h2>
				<p class="text-muted-foreground">Replay Zwift races in 2D</p>
			</div>

			<div class="w-full bg-card rounded-xl p-6 border border-border">
				<h3 class="text-lg font-semibold mb-4">Your Recent Races</h3>

				{#if loadingActivities}
					<p class="text-sm text-muted-foreground">Loading your recent races...</p>
				{:else if fetchError}
					<p class="text-sm text-destructive mb-4">{fetchError}</p>
				{:else if activities.length > 0}
					<select
						onchange={(e) => {
							const val = (e.target as HTMLSelectElement).value;
							if (val) handleLoadActivity(val);
						}}
						class="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
					>
						<option value="">Select a race...</option>
						{#each activities as activity}
							<option value={activity.activityId}>
								{activity.name} — {formatDate(activity.date)}
							</option>
						{/each}
					</select>
				{:else}
					<p class="text-sm text-muted-foreground">No recent races found.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
