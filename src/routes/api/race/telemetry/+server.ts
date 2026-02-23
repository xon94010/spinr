import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActivityDetailForRider, downloadFitFile, fetchJsonTelemetry } from '$lib/server/zwift-api';
import { parseFitFile } from '$lib/server/fit-parser';
import { buildRoute } from '$lib/server/route-builder';
import { getToken } from '$lib/server/zwift';
import type { Rider, RoutePoint, RaceData, EventResult, TelemetryRecord } from '$lib/types/race';

const CONCURRENCY = 10;

async function processRiderBatch(
	token: string,
	batch: EventResult[],
	leaderProfileId: number
): Promise<{ riders: Rider[]; route: RoutePoint[] }> {
	const riders: Rider[] = [];
	let route: RoutePoint[] = [];

	const results = await Promise.all(
		batch.map(async (participant) => {
			try {
				console.log(`Fetching telemetry for rider ${participant.profileId}, activity ${participant.activityId}`);
				const source = await getActivityDetailForRider(
					token,
					participant.profileId,
					participant.activityId
				);

				if (!source) {
					console.log(`  -> No source for rider ${participant.profileId}`);
					return null;
				}

				const isLeader = participant.profileId === leaderProfileId;
				let telemetry: TelemetryRecord[] = [];
				let gpsPoints: RoutePoint[] | undefined;

				if (source.type === 's3') {
					// Own activity: download FIT from S3 and parse
					const fitData = await downloadFitFile(source.bucket, source.key, token);
					const parsed = await parseFitFile(fitData, isLeader);
					telemetry = parsed.telemetry;
					gpsPoints = parsed.gpsPoints;
				} else if (source.type === 'json_url') {
					// Other rider: fetch JSON telemetry
					const records = await fetchJsonTelemetry(source.url, token);
					telemetry = records.map(r => ({
						elapsed: r.elapsed,
						distance: r.distance,
						power: r.power,
						heartRate: r.heartRate,
						speed: r.speed,
						cadence: r.cadence,
						altitude: r.altitude
					}));
					console.log(`  -> JSON telemetry: ${telemetry.length} records for rider ${participant.profileId}`);
				}

				if (telemetry.length === 0) return null;

				const rider: Rider = {
					profileId: participant.profileId,
					name: `${participant.firstName} ${participant.lastName}`.trim() || `Rider ${participant.profileId}`,
					activityId: participant.activityId,
					telemetry,
					weight: participant.weight
				};

				return {
					rider,
					gpsPoints: isLeader ? gpsPoints : undefined
				};
			} catch (e) {
				console.log(`  -> Error for rider ${participant.profileId}:`, e);
				return null;
			}
		})
	);

	for (const result of results) {
		if (!result) continue;
		riders.push(result.rider);
		if (result.gpsPoints?.length) {
			route = buildRoute(result.gpsPoints);
		}
	}

	return { riders, route };
}

export const POST: RequestHandler = async ({ request }) => {
	const { username, password, participants, eventName, eventSubgroupId, initiatorProfileId } =
		await request.json();

	if (!username || !password || !participants?.length) {
		return json({ error: 'username, password, and participants required' }, { status: 400 });
	}

	try {
		const token = await getToken(username, password);

		const allRiders: Rider[] = [];
		let finalRoute: RoutePoint[] = [];

		// Determine leader: first participant, or the initiator
		const leaderProfileId = initiatorProfileId || participants[0].profileId;

		// Re-order so the leader is processed first (to get GPS data)
		const sorted = [...participants].sort((a: EventResult, b: EventResult) => {
			if (a.profileId === leaderProfileId) return -1;
			if (b.profileId === leaderProfileId) return 1;
			return 0;
		});

		// Process in batches with concurrency limit
		for (let i = 0; i < sorted.length; i += CONCURRENCY) {
			const batch = sorted.slice(i, i + CONCURRENCY);
			const { riders, route } = await processRiderBatch(token, batch, leaderProfileId);
			allRiders.push(...riders);
			if (route.length > 0 && finalRoute.length === 0) {
				finalRoute = route;
			}
		}

		if (allRiders.length === 0) {
			return json({ error: 'Could not load telemetry for any riders' }, { status: 500 });
		}

		// Calculate totals
		let totalDistance = 0;
		let totalDuration = 0;
		for (const rider of allRiders) {
			const lastRecord = rider.telemetry[rider.telemetry.length - 1];
			if (lastRecord) {
				totalDistance = Math.max(totalDistance, lastRecord.distance);
			}
		}

		// Duration = when the last rider stops making progress (reaches their max distance)
		for (const rider of allRiders) {
			const last = rider.telemetry[rider.telemetry.length - 1];
			if (last) {
				totalDuration = Math.max(totalDuration, last.elapsed);
			}
		}

		// Find when the last-place rider reaches their max distance
		// to trim post-race data
		let raceEndTime = 0;
		for (const rider of allRiders) {
			const maxDist = rider.telemetry[rider.telemetry.length - 1]?.distance ?? 0;
			// Find the first time they reach 99% of their max distance
			for (const rec of rider.telemetry) {
				if (rec.distance >= maxDist * 0.99) {
					raceEndTime = Math.max(raceEndTime, rec.elapsed);
					break;
				}
			}
		}
		// Use race end time if it's reasonable (at least 60s, and less than total)
		if (raceEndTime > 60 && raceEndTime < totalDuration) {
			// Add a small buffer so the finish moment is visible
			totalDuration = raceEndTime + 10;
		}

		console.log(`Race loaded: ${allRiders.length} riders, ${finalRoute.length} route points, ${totalDistance}m, ${totalDuration}s`);

		const raceData: RaceData = {
			eventName: eventName || 'Race Replay',
			eventSubgroupId: eventSubgroupId || 0,
			route: finalRoute,
			riders: allRiders,
			totalDistance,
			totalDuration,
			myProfileId: initiatorProfileId || undefined
		};

		return json(raceData);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to load telemetry';
		return json({ error: message }, { status: 500 });
	}
};
