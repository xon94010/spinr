import type { RiderSnapshot } from '$lib/types/playback';

let playing = $state(false);
let currentTime = $state(0);
let duration = $state(0);
let speed = $state(1);
let selectedRiderId = $state<number | null>(null);
let followRiderId = $state<number | null>(null);
let riders = $state.raw<RiderSnapshot[]>([]);

export function getPlaybackStore() {
	return {
		get playing() { return playing; },
		get currentTime() { return currentTime; },
		get duration() { return duration; },
		get speed() { return speed; },
		get selectedRiderId() { return selectedRiderId; },
		get followRiderId() { return followRiderId; },
		get riders() { return riders; },

		setPlaying(v: boolean) { playing = v; },
		setCurrentTime(t: number) { currentTime = t; },
		setDuration(d: number) { duration = d; },
		setSpeed(s: number) { speed = s; },

		selectRider(id: number | null) {
			selectedRiderId = id;
		},

		followRider(id: number | null) {
			followRiderId = id;
		},

		updateRiders(r: RiderSnapshot[]) {
			riders = r;
		},

		reset() {
			playing = false;
			currentTime = 0;
			speed = 1;
			selectedRiderId = null;
			followRiderId = null;
			riders = [];
		}
	};
}
