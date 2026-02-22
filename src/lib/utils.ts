import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Activity, TimeInZones, TimeInHrZones } from './types';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
	ref?: E | null;
	children?: import('svelte').Snippet;
};

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;

export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatZoneTime(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
	const h = Math.floor(m / 60);
	const rm = m % 60;
	return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function calculateLoad(activity: Activity, ftp: number): number {
	const np = activity.normalizedPower ?? activity.avgPower;
	return ftp > 0 ? Math.round((activity.duration * np * np) / (ftp * ftp * 36)) : 0;
}

export function isRace(activityName: string | undefined): boolean {
	if (!activityName) return false;
	const nameLower = activityName.trim().toLowerCase();
	if (nameLower.includes('race:')) return true;
	const raceKeywords = ['zrl', 'wtrl', 'ttt', 'championship', 'grand prix', 'league', 'competition'];
	return raceKeywords.some(keyword => nameLower.includes(keyword));
}

export function trimActivityName(name: string): string {
	return name.replace(/^Zwift\s*-?\s*/i, '').trim();
}

export function getZoneBarWidths(zones: TimeInZones | undefined): number[] {
	if (!zones) return [0, 0, 0, 0, 0, 0, 0];
	const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7;
	if (total === 0) return [0, 0, 0, 0, 0, 0, 0];
	return [
		(zones.z1 / total) * 100,
		(zones.z2 / total) * 100,
		(zones.z3 / total) * 100,
		(zones.z4 / total) * 100,
		(zones.z5 / total) * 100,
		(zones.z6 / total) * 100,
		(zones.z7 / total) * 100
	];
}

export function generateElevationProfile(
	points: number[],
	width: number,
	height: number
): { linePath: string; areaPath: string; min: number; max: number } {
	if (points.length < 2) return { linePath: '', areaPath: '', min: 0, max: 0 };

	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min || 1;

	const coords = points.map((p, i) => {
		const x = (i / (points.length - 1)) * width;
		const y = height - ((p - min) / range) * height;
		return { x, y };
	});

	const linePath = `M${coords.map(c => `${c.x},${c.y}`).join(' L')}`;
	const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

	return { linePath, areaPath, min: Math.round(min), max: Math.round(max) };
}

export function aggregateZones(activities: Activity[]): TimeInZones | null {
	const zones: TimeInZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
	for (const act of activities) {
		if (act.timeInZones) {
			zones.z1 += act.timeInZones.z1;
			zones.z2 += act.timeInZones.z2;
			zones.z3 += act.timeInZones.z3;
			zones.z4 += act.timeInZones.z4;
			zones.z5 += act.timeInZones.z5;
			zones.z6 += act.timeInZones.z6;
			zones.z7 += act.timeInZones.z7;
		}
	}
	const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7;
	return total > 0 ? zones : null;
}

export function aggregateHrZones(activities: Activity[]): TimeInHrZones | null {
	const zones: TimeInHrZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
	for (const act of activities) {
		if (act.timeInHrZones) {
			zones.z1 += act.timeInHrZones.z1;
			zones.z2 += act.timeInHrZones.z2;
			zones.z3 += act.timeInHrZones.z3;
			zones.z4 += act.timeInHrZones.z4;
			zones.z5 += act.timeInHrZones.z5;
			zones.z6 += act.timeInHrZones.z6;
			zones.z7 += act.timeInHrZones.z7;
		}
	}
	const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5 + zones.z6 + zones.z7;
	return total > 0 ? zones : null;
}

export function getMaxHrFromActivities(activities: Activity[], fallback = 190): number {
	const maxHr = activities.reduce((max, a) => Math.max(max, a.maxHr ?? 0), 0);
	return maxHr > 0 ? maxHr : fallback;
}
