export interface TelemetryRecord {
	elapsed: number; // seconds from activity start
	distance: number; // meters
	power: number; // watts
	heartRate: number; // bpm
	speed: number; // m/s
	cadence: number; // rpm
	altitude: number; // meters
}

export interface RoutePoint {
	distance: number; // meters from start
	lat: number;
	lng: number;
	altitude: number;
}

export interface Rider {
	profileId: number;
	name: string;
	activityId: string;
	telemetry: TelemetryRecord[];
	weight?: number; // kg
}

export interface RaceData {
	eventName: string;
	eventSubgroupId: number;
	route: RoutePoint[];
	riders: Rider[];
	totalDistance: number; // max distance across all riders
	totalDuration: number; // max elapsed time across all riders
	myProfileId?: number; // the initiator's profileId
}

export interface ActivityDetail {
	id: string;
	name: string;
	profileId: number;
	eventSubgroupId?: number;
	fitFileBucket?: string;
	fitFileKey?: string;
	sport?: string;
	startDate?: string;
	distanceInMeters?: number;
}

export interface EventResult {
	profileId: number;
	activityId: string;
	firstName: string;
	lastName: string;
	weight?: number;
}
