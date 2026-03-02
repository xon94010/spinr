import type { TimeInZones, TimeInHrZones } from './types';

type Period = 'week' | 'month' | 'year' | 'all';

const mockProfiles = {
	volcano: [10, 15, 25, 40, 60, 90, 130, 180, 240, 310, 380, 440, 490, 520, 540, 550, 555, 550, 535, 510, 475, 430, 380, 320, 260, 200, 150, 110, 80, 55, 35, 25, 20, 18, 20, 25, 35, 50, 70, 95],
	flat: [10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 10, 12, 11, 10],
	hilly: [50, 80, 130, 200, 280, 340, 300, 240, 180, 140, 160, 220, 300, 400, 480, 520, 480, 400, 320, 250, 200, 180, 200, 260, 340, 420, 460, 440, 380, 300, 220, 150, 100, 70, 50, 45, 50, 60, 80, 100],
	climb: [200, 210, 230, 260, 300, 360, 440, 540, 660, 800, 950, 1100, 1250, 1380, 1500, 1600, 1680, 1740, 1780, 1800, 1790, 1760, 1700, 1620, 1520, 1400, 1270, 1130, 990, 850, 720, 600, 500, 420, 360, 320, 290, 270, 260, 250],
	crit: [15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15, 15, 16, 17, 17, 16, 15]
};

const mockZones: Record<string, TimeInZones> = {
	endurance: { z1: 300, z2: 2400, z3: 1800, z4: 600, z5: 200, z6: 80, z7: 20 },
	recovery: { z1: 1800, z2: 1500, z3: 240, z4: 50, z5: 10, z6: 0, z7: 0 },
	tempo: { z1: 180, z2: 1200, z3: 2400, z4: 1000, z5: 300, z6: 100, z7: 20 },
	intervals: { z1: 300, z2: 600, z3: 900, z4: 1200, z5: 900, z6: 480, z7: 120 },
	race: { z1: 60, z2: 180, z3: 360, z4: 720, z5: 840, z6: 420, z7: 120 },
	climb: { z1: 200, z2: 1800, z3: 3600, z4: 3000, z5: 1500, z6: 500, z7: 200 }
};

const mockHrZones: Record<string, TimeInHrZones> = {
	endurance: { z1: 2000, z2: 2400, z3: 800, z4: 200, z5: 0, z6: 0, z7: 0 },
	recovery: { z1: 2800, z2: 700, z3: 100, z4: 0, z5: 0, z6: 0, z7: 0 },
	tempo: { z1: 800, z2: 1800, z3: 1600, z4: 800, z5: 100, z6: 50, z7: 0 },
	intervals: { z1: 600, z2: 1200, z3: 1000, z4: 1200, z5: 300, z6: 150, z7: 50 },
	race: { z1: 200, z2: 400, z3: 600, z4: 1000, z5: 300, z6: 150, z7: 50 },
	climb: { z1: 1500, z2: 4000, z3: 3000, z4: 2000, z5: 200, z6: 80, z7: 20 }
};

function getMockDate(daysAgo: number): string {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const mockActivities = [
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

export const mockPeaks: Record<Period, Record<string, number>> = {
	week: { '5s': 720, '15s': 580, '30s': 450, '1m': 380, '5m': 280, '20m': 220, '60m': 195 },
	month: { '5s': 780, '15s': 620, '30s': 480, '1m': 395, '5m': 290, '20m': 225, '60m': 200 },
	year: { '5s': 850, '15s': 680, '30s': 520, '1m': 420, '5m': 305, '20m': 235, '60m': 208 },
	all: { '5s': 890, '15s': 710, '30s': 545, '1m': 445, '5m': 315, '20m': 240, '60m': 212 }
};
