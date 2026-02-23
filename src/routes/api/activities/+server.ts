import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProfileActivities } from '$lib/server/zwift-api';
import { getToken, getProfile } from '$lib/server/zwift';

export const POST: RequestHandler = async ({ request }) => {
	const { username, password } = await request.json();

	if (!username || !password) {
		return json({ error: 'username and password required' }, { status: 400 });
	}

	try {
		const token = await getToken(username, password);
		const profile = await getProfile(username, password);
		const activities = await getProfileActivities(token, profile.id);
		const races = activities.filter((a) => a.isRace);
		return json({ activities: races });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch activities';
		return json({ error: message }, { status: 500 });
	}
};
