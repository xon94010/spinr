import type { TelemetryRecord, Rider } from '$lib/types/race';

/**
 * Binary search for the two telemetry records surrounding the given elapsed time.
 * Returns interpolated field values.
 */
export function interpolateRiderAtTime(
	rider: Rider,
	time: number
): {
	distance: number;
	power: number;
	heartRate: number;
	speed: number;
	cadence: number;
	altitude: number;
} | null {
	const t = rider.telemetry;
	if (t.length === 0) return null;

	// Before start
	if (time <= t[0].elapsed) {
		return fieldValues(t[0]);
	}

	// After end
	if (time >= t[t.length - 1].elapsed) {
		return fieldValues(t[t.length - 1]);
	}

	// Binary search
	let lo = 0;
	let hi = t.length - 1;

	while (lo < hi - 1) {
		const mid = (lo + hi) >> 1;
		if (t[mid].elapsed <= time) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const a = t[lo];
	const b = t[hi];
	const span = b.elapsed - a.elapsed;
	const frac = span > 0 ? (time - a.elapsed) / span : 0;

	return {
		distance: lerp(a.distance, b.distance, frac),
		power: lerp(a.power, b.power, frac),
		heartRate: lerp(a.heartRate, b.heartRate, frac),
		speed: lerp(a.speed, b.speed, frac),
		cadence: lerp(a.cadence, b.cadence, frac),
		altitude: lerp(a.altitude, b.altitude, frac)
	};
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function fieldValues(r: TelemetryRecord) {
	return {
		distance: r.distance,
		power: r.power,
		heartRate: r.heartRate,
		speed: r.speed,
		cadence: r.cadence,
		altitude: r.altitude
	};
}
