import type { ActivityDetail, EventResult } from '$lib/types/race';

const API_URL = 'https://us-or-rly101.zwift.com';

function parseActivityResponse(data: Record<string, unknown>, fallbackProfileId: number): ActivityDetail {
	// eventSubgroupId can be at the top level OR nested inside eventInfo
	let eventSubgroupId: number | undefined =
		(data.eventSubgroupId as number) || (data.event_subgroup_id as number) || undefined;

	if (!eventSubgroupId && data.eventInfo) {
		const eventInfo = data.eventInfo as Record<string, unknown>;
		console.log('eventInfo keys:', Object.keys(eventInfo));
		console.log('eventInfo:', JSON.stringify(eventInfo));
		eventSubgroupId =
			(eventInfo.eventSubgroupId as number) ||
			(eventInfo.eventSubGroupId as number) ||
			(eventInfo.subgroupId as number) ||
			(eventInfo.event_subgroup_id as number) ||
			undefined;
	}

	console.log('Resolved eventSubgroupId:', eventSubgroupId);

	return {
		id: (data.id_str as string) || String(data.id),
		name: (data.name as string) || 'Zwift Activity',
		profileId: (data.profileId as number) || (data.profile_id as number) || fallbackProfileId,
		eventSubgroupId,
		fitFileBucket: data.fitFileBucket as string,
		fitFileKey: data.fitFileKey as string,
		sport: data.sport as string,
		startDate: data.startDate as string,
		distanceInMeters: data.distanceInMeters as number
	};
}

export async function getActivityDetail(
	token: string,
	profileId: number,
	activityId: string
): Promise<ActivityDetail> {
	// Try profile-scoped endpoint first
	const response = await fetch(`${API_URL}/api/profiles/${profileId}/activities/${activityId}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch activity ${activityId}: ${response.status}`);
	}

	const data = await response.json();
	return parseActivityResponse(data, profileId);
}

/**
 * Try to fetch an activity using the non-profile-scoped endpoint.
 * Falls back to profile-scoped if needed.
 */
export async function getActivityDetailAnyProfile(
	token: string,
	activityId: string,
	fallbackProfileId: number
): Promise<ActivityDetail | null> {
	// Try the profile-scoped endpoint with the logged-in user's profileId
	try {
		const response = await fetch(
			`${API_URL}/api/profiles/${fallbackProfileId}/activities/${activityId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			}
		);

		if (response.ok) {
			const data = await response.json();
			return parseActivityResponse(data, fallbackProfileId);
		}
		console.log('Profile-scoped activity fetch returned:', response.status);
	} catch (e) {
		console.log('Profile-scoped activity fetch failed:', e);
	}

	// Try the generic activity endpoint (some Zwift API versions support this)
	try {
		const response = await fetch(
			`${API_URL}/api/activities/${activityId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			}
		);

		console.log('Generic activity endpoint status:', response.status);
		if (response.ok) {
			const data = await response.json();
			return parseActivityResponse(data, fallbackProfileId);
		}
	} catch (e) {
		console.log('Generic activity fetch failed:', e);
	}

	return null;
}

export async function getEventResults(
	token: string,
	eventSubgroupId: number
): Promise<EventResult[]> {
	let allResults: Record<string, unknown>[] = [];

	// 1) Try segment-results first — returns ALL results without pagination
	const segmentUrl = `${API_URL}/api/developer/segment-results?event_subgroup_id=${eventSubgroupId}`;
	console.log('Trying segment-results endpoint:', segmentUrl);
	try {
		const resp = await fetch(segmentUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json'
			}
		});
		console.log(`  -> ${resp.status}`);
		if (resp.ok) {
			const data = await resp.json();
			const segList = (data.segmentResultList || data.segment_result_list || []) as Record<string, unknown>[];
			console.log(`  -> Got ${segList.length} segment results`);
			if (segList.length > 0) {
				allResults = segList;
			}
		}
	} catch (e) {
		console.log('  -> segment-results error:', e);
	}

	// 2) Fallback to race-results/entries (max 25, but better than nothing)
	if (allResults.length === 0) {
		const fallbackUrl = `${API_URL}/api/race-results/entries?event_subgroup_id=${eventSubgroupId}`;
		console.log('Falling back to race-results/entries:', fallbackUrl);
		try {
			const resp = await fetch(fallbackUrl, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			});
			console.log(`  -> ${resp.status}`);
			if (resp.ok) {
				const data = await resp.json();
				let entries: Record<string, unknown>[];
				if (Array.isArray(data)) {
					entries = data;
				} else if (data && typeof data === 'object') {
					entries = (data.entries || data.results || data.data || []) as Record<string, unknown>[];
				} else {
					entries = [];
				}
				console.log(`  -> Got ${entries.length} entries`);
				allResults = entries;
			}
		} catch (e) {
			console.log('  -> race-results error:', e);
		}
	}

	if (allResults.length === 0) {
		throw new Error('Failed to fetch event results from any endpoint');
	}

	console.log('First result entry keys:', Object.keys(allResults[0]).join(', '));
	console.log('Total entries:', allResults.length);

	return allResults
		.filter((r) => {
			const pid = (r.profileId as number) || (r.profile_id as number) || (r.riderId as number);
			const actData = r.activityData as Record<string, unknown> | undefined;
			const aid = r.activityId || r.activity_id || actData?.activityId;
			return pid || aid;
		})
		.map((r) => {
			const actData = r.activityData as Record<string, unknown> | undefined;
			const profileData = r.profileData as Record<string, unknown> | undefined;

			const profileId =
				(r.profileId as number) ||
				(r.profile_id as number) ||
				(r.riderId as number) ||
				(profileData?.profileId as number) ||
				0;

			const activityId = String(
				r.activityId || r.activity_id ||
				actData?.activityId || actData?.activity_id ||
				actData?.id_str || ''
			);

			const firstName =
				(r.firstName as string) ||
				(profileData?.firstName as string) ||
				(r.first_name as string) ||
				'';
			const lastName =
				(r.lastName as string) ||
				(profileData?.lastName as string) ||
				(r.last_name as string) ||
				'';

			const rawWeight =
				(r.weightInGrams as number) ||
				(r.weight as number) ||
				(profileData?.weightInGrams as number) ||
				(profileData?.weight as number) ||
				(actData?.weightInGrams as number) ||
				(actData?.weight as number) ||
				0;
			const weight = rawWeight > 1000 ? rawWeight / 1000 : rawWeight > 0 ? rawWeight : undefined;

			return {
				profileId,
				activityId,
				firstName,
				lastName,
				weight
			};
		});
}

export async function getProfileActivities(
	token: string,
	profileId: number
): Promise<{ activityId: string; name: string; date: string; isRace: boolean; eventSubgroupId?: number }[]> {
	const url = `${API_URL}/api/profiles/${profileId}/activities?start=0&limit=50`;
	console.log('Fetching profile activities:', url);

	const resp = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		}
	});

	if (!resp.ok) {
		throw new Error(`Failed to fetch activities: ${resp.status}`);
	}

	const data = await resp.json();
	const activities = Array.isArray(data) ? data : (data.activities || data.data || []);

	console.log(`Got ${activities.length} activities`);

	return activities.map((a: Record<string, unknown>) => {
		const rawName = (a.name as string) || 'Zwift Activity';
		const isRace = /race:/i.test(rawName);
		const name = rawName.replace(/^Zwift\s*-\s*Race:\s*/i, '').trim();
		return {
			activityId: (a.id_str as string) || String(a.id),
			name,
			date: (a.startDate as string) || '',
			isRace,
			eventSubgroupId: (a.eventSubgroupId as number) || undefined
		};
	});
}

export async function downloadFitFile(
	bucket: string,
	key: string,
	token?: string
): Promise<ArrayBuffer> {
	// Direct URL (from fitnessData.fullDataUrl)
	const url = bucket === '__direct__'
		? key
		: `https://${bucket}.s3.amazonaws.com/${key}`;

	if (bucket === '__direct__') {
		const resp = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': '*/*',
			}
		});

		if (!resp.ok) {
			throw new Error(`FIT download failed: ${resp.status} from ${url.substring(0, 80)}`);
		}

		const contentType = resp.headers.get('content-type') || '';

		// The fullDataUrl endpoint returns JSON telemetry, not a FIT file
		if (contentType.includes('application/json')) {
			throw new Error('__JSON_TELEMETRY__');
		}

		const buf = await resp.arrayBuffer();
		console.log(`  FIT download OK: ${buf.byteLength} bytes, content-type=${contentType}`);

		// Check if it's gzipped (starts with 0x1f 0x8b)
		const bytes = new Uint8Array(buf);
		if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
			console.log(`  Detected gzip, decompressing...`);
			const { gunzipSync } = await import('node:zlib');
			const decompressed = gunzipSync(Buffer.from(buf));
			return decompressed.buffer.slice(
				decompressed.byteOffset,
				decompressed.byteOffset + decompressed.byteLength
			);
		}

		return buf;
	}

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`FIT download failed: ${response.status} from ${url.substring(0, 80)}`);
	}

	return response.arrayBuffer();
}

export type RiderFitSource =
	| { type: 's3'; bucket: string; key: string }
	| { type: 'json_url'; url: string };

export async function getActivityDetailForRider(
	token: string,
	profileId: number,
	activityId: string
): Promise<RiderFitSource | null> {
	const urls = [
		// Profile-scoped (works for own activities)
		`${API_URL}/api/profiles/${profileId}/activities/${activityId}`,
		// Generic (works for any activity)
		`${API_URL}/api/activities/${activityId}`,
	];

	for (const url of urls) {
		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			});

			if (!response.ok) {
				console.log(`  FIT detail ${response.status} for ${url}`);
				continue;
			}

			const data = await response.json();
			if (data.fitFileBucket && data.fitFileKey) {
				console.log(`  Using S3 bucket/key for rider ${profileId}`);
				return { type: 's3', bucket: data.fitFileBucket, key: data.fitFileKey };
			}
			// fullDataUrl returns JSON telemetry, not a FIT file
			if (data.fitnessData?.fullDataUrl) {
				console.log(`  Using JSON telemetry URL for rider ${profileId}`);
				return { type: 'json_url', url: data.fitnessData.fullDataUrl };
			}
		} catch (e) {
			console.log(`  FIT detail error for ${url}:`, e);
			continue;
		}
	}

	return null;
}

/**
 * Fetch JSON telemetry from Zwift's fullDataUrl endpoint.
 * Returns parsed telemetry records.
 */
export async function fetchJsonTelemetry(
	url: string,
	token: string
): Promise<{ elapsed: number; distance: number; power: number; heartRate: number; speed: number; cadence: number; altitude: number }[]> {
	const resp = await fetch(url, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': '*/*',
		}
	});

	if (!resp.ok) {
		throw new Error(`JSON telemetry fetch failed: ${resp.status}`);
	}

	const data = await resp.json() as Record<string, unknown>;
	console.log(`  JSON telemetry keys: ${Object.keys(data).join(', ')}`);

	// Parse the JSON telemetry format
	const powerArr = (data.powerInWatts || []) as number[];
	const hrArr = (data.heartRate || []) as number[];
	const speedArr = (data.speedInCmPerSec || []) as number[];
	const cadenceArr = (data.cadencePerMin || []) as number[];
	const distanceArr = (data.distanceInCm || []) as number[]; // cumulative distance in cm
	const altitudeArr = (data.altitudeInCm || []) as number[];
	const timeArr = (data.timeInSec || []) as number[];

	const len = Math.max(powerArr.length, hrArr.length, speedArr.length, distanceArr.length, 0);
	if (len === 0) {
		console.log(`  No telemetry arrays found in JSON`);
		return [];
	}

	console.log(`  JSON telemetry: ${len} data points`);

	const records: { elapsed: number; distance: number; power: number; heartRate: number; speed: number; cadence: number; altitude: number }[] = [];

	for (let i = 0; i < len; i++) {
		records.push({
			elapsed: timeArr[i] ?? i,
			distance: (distanceArr[i] || 0) / 100, // cm -> m (cumulative)
			power: powerArr[i] || 0,
			heartRate: hrArr[i] || 0,
			speed: (speedArr[i] || 0) / 100, // cm/s -> m/s
			cadence: cadenceArr[i] || 0,
			altitude: (altitudeArr[i] || 0) / 100, // cm -> m
		});
	}

	return records;
}
