import { getStats } from './src/lib/server/zwift.ts';

// Read credentials from environment or use test ones
const username = process.env.ZWIFT_USER;
const password = process.env.ZWIFT_PASS;

if (!username || !password) {
  console.log('Set ZWIFT_USER and ZWIFT_PASS environment variables');
  process.exit(1);
}

console.log('Testing FIT file fetch...');
const stats = await getStats(username, password, 'month', true);
console.log('Stats received:', JSON.stringify(stats, null, 2));
