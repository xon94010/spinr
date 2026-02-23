<script lang="ts">
	import type { RiderSnapshot } from '$lib/types/playback';

	let {
		riders,
		selectedRiderId,
		onSelectRider,
		onFollowRider
	}: {
		riders: RiderSnapshot[];
		selectedRiderId: number | null;
		onSelectRider: (id: number | null) => void;
		onFollowRider: (id: number | null) => void;
	} = $props();

	type SortKey = 'position' | 'name' | 'power' | 'wkg' | 'heartRate' | 'speed';
	let sortKey = $state<SortKey>('position');
	let sortAsc = $state(true);

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = key === 'name';
		}
	}

	// Trim parenthesized suffixes from names, e.g. "John Doe (TeamX)" -> "John Doe"
	function trimName(name: string): string {
		return name.replace(/\s*\(.*?\)\s*$/, '').trim();
	}

	let sorted = $derived.by(() => {
		const arr = [...riders].sort((a, b) => b.distance - a.distance);
		const leaderDistance = arr.length > 0 ? arr[0].distance : 0;
		const leaderSpeed = arr.length > 0 ? arr[0].speed : 0;

		const positioned = arr.map((r, i) => {
			const distGap = leaderDistance - r.distance;
			// Time gap: distance gap / leader's current speed
			let timeGap = 0;
			if (i > 0 && leaderSpeed > 0.5) {
				timeGap = distGap / leaderSpeed;
			}
			return { ...r, position: i + 1, timeGap };
		});

		let compareFn: (a: typeof positioned[0], b: typeof positioned[0]) => number;
		switch (sortKey) {
			case 'position':
				compareFn = (a, b) => a.position - b.position;
				break;
			case 'name':
				compareFn = (a, b) => a.name.localeCompare(b.name);
				break;
			case 'power':
				compareFn = (a, b) => a.power - b.power;
				break;
			case 'wkg':
				compareFn = (a, b) => {
					const aWkg = a.weight > 0 ? a.power / a.weight : 0;
					const bWkg = b.weight > 0 ? b.power / b.weight : 0;
					return aWkg - bWkg;
				};
				break;
			case 'heartRate':
				compareFn = (a, b) => a.heartRate - b.heartRate;
				break;
			case 'speed':
				compareFn = (a, b) => a.speed - b.speed;
				break;
		}

		positioned.sort(compareFn);
		if (!sortAsc) positioned.reverse();
		return positioned;
	});

	function headerClass(key: SortKey): string {
		return sortKey === key ? 'text-primary' : 'text-muted-foreground';
	}

	function sortIndicator(key: SortKey): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' \u25B2' : ' \u25BC';
	}

	function formatTimeGap(seconds: number): string {
		if (seconds <= 0) return '-';
		if (seconds < 60) return `+${Math.round(seconds)}s`;
		const m = Math.floor(seconds / 60);
		const s = Math.round(seconds % 60);
		return `+${m}:${String(s).padStart(2, '0')}`;
	}

	function formatGap(rider: typeof sorted[0]): string {
		if (rider.distanceToFinish > 1000) {
			return `${(rider.distanceToFinish / 1000).toFixed(1)}km`;
		}
		return `${Math.round(rider.distanceToFinish)}m`;
	}
</script>

<div class="flex flex-col h-full overflow-hidden">
	<table class="w-full text-xs table-fixed">
		<thead class="sticky top-0 bg-card z-10">
			<tr class="border-b border-border">
				<th
					class="w-7 py-2 text-center cursor-pointer select-none {headerClass('position')}"
					onclick={() => toggleSort('position')}
				>
					#{sortIndicator('position')}
				</th>
				<th
					class="py-2 text-left cursor-pointer select-none {headerClass('name')}"
					onclick={() => toggleSort('name')}
				>
					Name{sortIndicator('name')}
				</th>
				<th
					class="w-10 py-2 text-center cursor-pointer select-none {headerClass('power')}"
					onclick={() => toggleSort('power')}
				>
					W{sortIndicator('power')}
				</th>
				<th
					class="w-11 py-2 text-center cursor-pointer select-none {headerClass('wkg')}"
					onclick={() => toggleSort('wkg')}
				>
					w/kg{sortIndicator('wkg')}
				</th>
				<th
					class="w-9 py-2 text-center cursor-pointer select-none {headerClass('heartRate')}"
					onclick={() => toggleSort('heartRate')}
				>
					HR{sortIndicator('heartRate')}
				</th>
				<th
					class="w-11 py-2 text-center cursor-pointer select-none {headerClass('speed')}"
					onclick={() => toggleSort('speed')}
				>
					km/h{sortIndicator('speed')}
				</th>
				<th class="w-12 py-2 text-center text-muted-foreground">
					Gap
				</th>
				<th class="w-12 py-2 text-center text-muted-foreground">
					Finish
				</th>
			</tr>
		</thead>
	</table>
	<div class="flex-1 overflow-y-auto">
		<table class="w-full text-xs table-fixed">
			<tbody>
				{#each sorted as rider (rider.riderId)}
					<tr
						class="border-b border-border/50 cursor-pointer hover:bg-accent/50 transition-colors
							{rider.riderId === selectedRiderId ? 'bg-accent' : ''}
							{rider.isMe ? 'bg-amber-900/20' : ''}"
						onclick={() => onSelectRider(rider.riderId)}
						ondblclick={() => onFollowRider(rider.riderId)}
					>
						<td class="w-7 py-1.5 text-center text-muted-foreground">{rider.position}</td>
						<td class="py-1.5 truncate">
							<span class="flex items-center gap-1">
								{#if rider.isMe}
									<span class="text-amber-400 text-sm shrink-0 leading-none">&#9733;</span>
								{:else}
									<span
										class="inline-block w-2 h-2 rounded-full shrink-0"
										style="background: {rider.color}"
									></span>
								{/if}
								<span
									class="truncate {rider.isMe ? 'text-amber-400 font-bold' : ''}"
								>
									{trimName(rider.name)}
								</span>
							</span>
						</td>
						<td class="w-10 py-1.5 text-center font-mono">{Math.round(rider.power)}</td>
						<td class="w-11 py-1.5 text-center font-mono">
							{rider.weight > 0 ? (rider.power / rider.weight).toFixed(1) : '-'}
						</td>
						<td class="w-9 py-1.5 text-center font-mono">
							{rider.heartRate > 0 ? Math.round(rider.heartRate) : '-'}
						</td>
						<td class="w-11 py-1.5 text-center font-mono">
							{(rider.speed * 3.6).toFixed(1)}
						</td>
						<td class="w-12 py-1.5 text-center font-mono text-muted-foreground">
							{formatTimeGap(rider.timeGap)}
						</td>
						<td class="w-12 py-1.5 text-center font-mono text-muted-foreground">
							{formatGap(rider)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
