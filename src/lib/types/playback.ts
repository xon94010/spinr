export interface RiderSnapshot {
	riderId: number; // profileId
	name: string;
	distance: number;
	distanceToFinish: number;
	power: number;
	heartRate: number;
	speed: number;
	cadence: number;
	altitude: number;
	lat: number;
	lng: number;
	weight: number;
	color: string;
	isMe: boolean;
}

export interface PlaybackState {
	playing: boolean;
	currentTime: number;
	duration: number;
	speed: number;
	selectedRiderId: number | null;
	followRiderId: number | null;
	riders: RiderSnapshot[];
}
