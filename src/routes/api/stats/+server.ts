import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStats } from '$lib/server/zwift';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { username, password, period, includePeaks } = await request.json();

		if (!username || !password) {
			return json({ error: 'Credentials required' }, { status: 400 });
		}

		const stats = await getStats(username, password, period || 'week', includePeaks ?? false);
		return json(stats);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
