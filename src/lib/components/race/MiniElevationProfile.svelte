<script lang="ts">
	import type { RoutePoint } from '$lib/types/race';
	import type { RiderSnapshot } from '$lib/types/playback';

	let {
		route,
		riders,
		selectedRiderId,
		totalDistance
	}: {
		route: RoutePoint[];
		riders: RiderSnapshot[];
		selectedRiderId: number | null;
		totalDistance: number;
	} = $props();

	const WIDTH = 800;
	const HEIGHT = 60;
	const PADDING = 2;

	// Grade % -> color (cycling standard gradient colors)
	function gradeColor(grade: number): string {
		const g = Math.abs(grade);
		if (g < 3) return '#22c55e';   // green - flat/easy
		if (g < 5) return '#84cc16';   // lime - moderate
		if (g < 7) return '#eab308';   // yellow - hard
		if (g < 9) return '#f97316';   // orange - very hard
		if (g < 12) return '#ef4444';  // red - steep
		return '#1e1e1e';              // near-black - extreme
	}

	let altRange = $derived.by(() => {
		if (route.length < 2) return { min: 0, max: 1 };
		let minAlt = Infinity;
		let maxAlt = -Infinity;
		for (const p of route) {
			if (p.altitude < minAlt) minAlt = p.altitude;
			if (p.altitude > maxAlt) maxAlt = p.altitude;
		}
		return { min: minAlt, max: maxAlt };
	});

	function toX(dist: number): number {
		return (dist / totalDistance) * (WIDTH - PADDING * 2) + PADDING;
	}

	function toY(alt: number): number {
		const range = altRange.max - altRange.min || 1;
		return HEIGHT - PADDING - ((alt - altRange.min) / range) * (HEIGHT - PADDING * 2);
	}

	// Build colored segments: each segment is a filled polygon from the line down to the bottom
	let segments = $derived.by(() => {
		if (route.length < 2 || totalDistance === 0) return [];

		const result: { pathD: string; color: string }[] = [];

		for (let i = 0; i < route.length - 1; i++) {
			const p0 = route[i];
			const p1 = route[i + 1];
			const dx = p1.distance - p0.distance;
			const dy = p1.altitude - p0.altitude;
			const grade = dx > 0 ? (dy / dx) * 100 : 0;

			const x0 = toX(p0.distance);
			const x1 = toX(p1.distance);
			const y0 = toY(p0.altitude);
			const y1 = toY(p1.altitude);

			const fillPath = `M${x0},${y0}L${x1},${y1}L${x1},${HEIGHT}L${x0},${HEIGHT}Z`;
			result.push({ pathD: fillPath, color: gradeColor(grade) });
		}

		return result;
	});

	// Outline path for the profile line
	let outlineD = $derived.by(() => {
		if (route.length < 2 || totalDistance === 0) return '';
		let d = '';
		for (let i = 0; i < route.length; i++) {
			const x = toX(route[i].distance);
			const y = toY(route[i].altitude);
			d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
		}
		return d;
	});

	// Get altitude at a given distance by interpolating the route
	function getAltitudeAtDistance(dist: number): number {
		if (route.length === 0) return 0;
		if (dist <= route[0].distance) return route[0].altitude;
		if (dist >= route[route.length - 1].distance) return route[route.length - 1].altitude;

		for (let i = 1; i < route.length; i++) {
			if (route[i].distance >= dist) {
				const prev = route[i - 1];
				const curr = route[i];
				const t = (dist - prev.distance) / (curr.distance - prev.distance || 1);
				return prev.altitude + t * (curr.altitude - prev.altitude);
			}
		}
		return route[route.length - 1].altitude;
	}

	let riderMarkers = $derived.by(() => {
		if (totalDistance === 0) return [];

		// Show top 5 + selected + me
		const sorted = [...riders].sort((a, b) => b.distance - a.distance);
		const shown = new Set<number>();

		for (let i = 0; i < Math.min(5, sorted.length); i++) {
			shown.add(sorted[i].riderId);
		}
		if (selectedRiderId !== null) shown.add(selectedRiderId);
		for (const r of riders) {
			if (r.isMe) shown.add(r.riderId);
		}

		const markers: { x: number; y: number; color: string; selected: boolean; isMe: boolean; riderId: number }[] = [];

		for (const rider of riders) {
			if (!shown.has(rider.riderId)) continue;
			const x = toX(rider.distance);
			const alt = getAltitudeAtDistance(rider.distance);
			const y = toY(alt);
			markers.push({
				x,
				y,
				color: rider.isMe ? '#fbbf24' : rider.color,
				selected: rider.riderId === selectedRiderId,
				isMe: rider.isMe,
				riderId: rider.riderId
			});
		}

		return markers;
	});
</script>

<div class="w-full px-4 py-2 bg-card border-t border-border">
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="w-full h-12" preserveAspectRatio="none">
		<!-- Gradient-colored fill segments by grade % -->
		{#each segments as seg, i (i)}
			<path d={seg.pathD} fill={seg.color} opacity="0.35" />
		{/each}

		<!-- Profile outline -->
		{#if outlineD}
			<path d={outlineD} fill="none" stroke="rgba(255, 255, 255, 0.5)" stroke-width="1" />
		{/if}

		<!-- Rider markers -->
		{#each riderMarkers as marker (marker.riderId)}
			{#if marker.isMe}
				<polygon
					points="{marker.x},{marker.y - 5} {marker.x + 3.5},{marker.y} {marker.x},{marker.y + 5} {marker.x - 3.5},{marker.y}"
					fill="#fbbf24"
					stroke="#92400e"
					stroke-width="0.8"
				/>
			{:else}
				<circle
					cx={marker.x}
					cy={marker.y}
					r={marker.selected ? 4 : 2.5}
					fill={marker.color}
					opacity={marker.selected ? 1 : 0.8}
				/>
			{/if}
		{/each}
	</svg>
</div>
