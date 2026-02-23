import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActivityDetailAnyProfile, getEventResults } from '$lib/server/zwift-api';
import { getToken, getProfile } from '$lib/server/zwift';

export const POST: RequestHandler = async ({ request }) => {
	const { username, password, activityId } = await request.json();

	if (!username || !password || !activityId) {
		return json({ error: 'username, password, and activityId required' }, { status: 400 });
	}

	try {
		const token = await getToken(username, password);
		const profile = await getProfile(username, password);
		const profileId = profile.id;

		// First try: treat input as an activity ID
		let eventSubgroupId: number | undefined;
		let eventName = 'Race Replay';

		const activity = await getActivityDetailAnyProfile(token, activityId, profileId);
		if (activity) {
			eventSubgroupId = activity.eventSubgroupId;
			eventName = activity.name;
			console.log('Activity detail:', JSON.stringify({
				id: activity.id,
				name: activity.name,
				eventSubgroupId: activity.eventSubgroupId,
				profileId: activity.profileId,
				sport: activity.sport
			}));
		} else {
			console.log('Could not fetch activity', activityId, 'for any profile');
		}

		// If no eventSubgroupId found, try treating the input as an event subgroup ID directly
		if (!eventSubgroupId) {
			const asNumber = parseInt(activityId, 10);
			if (!isNaN(asNumber)) {
				console.log('Trying input as eventSubgroupId:', asNumber);
				try {
					const results = await getEventResults(token, asNumber);
					if (results.length > 0) {
						eventSubgroupId = asNumber;
						eventName = 'Race Replay';
					}
				} catch {
					// Not a valid event subgroup ID either
				}
			}
		}

		if (!eventSubgroupId) {
			return json(
				{
					error: 'Could not find a race event. Make sure you enter your own Activity ID from a race (found in your Zwift activity feed), not an event ID.'
				},
				{ status: 400 }
			);
		}

		// Get all participants from the event results
		const results = await getEventResults(token, eventSubgroupId);

		if (results.length === 0) {
			return json({ error: 'No participants found for this event' }, { status: 404 });
		}

		return json({
			eventName,
			eventSubgroupId,
			participants: results,
			initiatorProfileId: profileId,
			initiatorActivityId: activityId
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch race data';
		return json({ error: message }, { status: 500 });
	}
};
