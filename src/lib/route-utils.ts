import type { RoutePoint } from '$lib/types/race';

/**
 * Interpolate a position along the route at a given distance.
 * Client-safe — no server dependencies.
 */
export function interpolateRoute(
	route: RoutePoint[],
	distance: number
): { lat: number; lng: number; altitude: number } | null {
	if (route.length === 0) return null;

	if (distance <= route[0].distance) {
		return { lat: route[0].lat, lng: route[0].lng, altitude: route[0].altitude };
	}

	if (distance >= route[route.length - 1].distance) {
		const last = route[route.length - 1];
		return { lat: last.lat, lng: last.lng, altitude: last.altitude };
	}

	// Binary search for the segment
	let lo = 0;
	let hi = route.length - 1;

	while (lo < hi - 1) {
		const mid = (lo + hi) >> 1;
		if (route[mid].distance <= distance) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const a = route[lo];
	const b = route[hi];
	const segmentLen = b.distance - a.distance;
	const t = segmentLen > 0 ? (distance - a.distance) / segmentLen : 0;

	return {
		lat: a.lat + (b.lat - a.lat) * t,
		lng: a.lng + (b.lng - a.lng) * t,
		altitude: a.altitude + (b.altitude - a.altitude) * t
	};
}
