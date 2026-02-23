import type { RoutePoint } from '$lib/types/race';

/**
 * Build a distance-indexed polyline from GPS points.
 * Smooths and deduplicates points, ensuring monotonically increasing distance.
 */
export function buildRoute(gpsPoints: RoutePoint[]): RoutePoint[] {
	if (gpsPoints.length === 0) return [];

	const route: RoutePoint[] = [];
	let lastDistance = -1;

	for (const point of gpsPoints) {
		if (point.lat === 0 && point.lng === 0) continue;
		if (point.distance <= lastDistance) continue;

		route.push({
			distance: point.distance,
			lat: point.lat,
			lng: point.lng,
			altitude: point.altitude
		});

		lastDistance = point.distance;
	}

	return route;
}
