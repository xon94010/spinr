export interface TimeInZones {
	z1: number;
	z2: number;
	z3: number;
	z4: number;
	z5: number;
	z6: number;
	z7: number;
}

export interface TimeInHrZones {
	z1: number;
	z2: number;
	z3: number;
	z4: number;
	z5: number;
	z6: number;
	z7: number;
}

export interface Activity {
	id: string;
	name: string;
	date: string;
	distance: number;
	duration: number;
	elevation: number;
	avgPower: number;
	calories: number;
	world?: string;
	route?: string;
	avgHr?: number;
	maxHr?: number;
	maxPower?: number;
	normalizedPower?: number;
	elevationProfile?: number[];
	timeInZones?: TimeInZones;
	timeInHrZones?: TimeInHrZones;
	work?: number;
	tss?: number;
	intensityFactor?: number;
}

export interface ZoneConfig {
	key: string;
	label: string;
	name: string;
	color: string;
}

export const ZONE_CONFIG: ZoneConfig[] = [
	{ key: 'z1', label: 'Z1', name: 'Recovery', color: '#94a3b8' },
	{ key: 'z2', label: 'Z2', name: 'Endurance', color: '#3b82f6' },
	{ key: 'z3', label: 'Z3', name: 'Tempo', color: '#22c55e' },
	{ key: 'z4', label: 'Z4', name: 'Threshold', color: '#eab308' },
	{ key: 'z5', label: 'Z5', name: 'VO2max', color: '#f97316' },
	{ key: 'z6', label: 'Z6', name: 'Anaerobic', color: '#ef4444' },
	{ key: 'z7', label: 'Z7', name: 'Neuromusc.', color: '#7c3aed' }
] as const;

export const HR_ZONE_CONFIG: ZoneConfig[] = [
	{ key: 'z1', label: 'Z1', name: 'Recovery', color: '#94a3b8' },
	{ key: 'z2', label: 'Z2', name: 'Endurance', color: '#3b82f6' },
	{ key: 'z3', label: 'Z3', name: 'Tempo', color: '#22c55e' },
	{ key: 'z4', label: 'Z4', name: 'Threshold', color: '#eab308' },
	{ key: 'z5', label: 'Z5', name: 'VO2max', color: '#f97316' },
	{ key: 'z6', label: 'Z6', name: 'Anaerobic', color: '#ef4444' },
	{ key: 'z7', label: 'Z7', name: 'Neuromusc.', color: '#7c3aed' }
] as const;
