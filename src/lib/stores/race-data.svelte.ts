import type { RaceData } from '$lib/types/race';

let raceData = $state.raw<RaceData | null>(null);
let loading = $state(false);
let loadingMessage = $state('');
let error = $state('');

export function getRaceStore() {
	return {
		get data() { return raceData; },
		get loading() { return loading; },
		get loadingMessage() { return loadingMessage; },
		get error() { return error; },

		setData(data: RaceData) {
			raceData = data;
			loading = false;
			loadingMessage = '';
			error = '';
		},

		setLoading(msg: string) {
			loading = true;
			loadingMessage = msg;
			error = '';
		},

		setError(msg: string) {
			error = msg;
			loading = false;
			loadingMessage = '';
		},

		clear() {
			raceData = null;
			loading = false;
			loadingMessage = '';
			error = '';
		}
	};
}
