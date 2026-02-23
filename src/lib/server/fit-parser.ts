import FitParser from 'fit-file-parser';
import type { TelemetryRecord, RoutePoint } from '$lib/types/race';

interface FitRecord {
	elapsed_time?: number;
	timer_time?: number;
	timestamp?: Date;
	distance?: number;
	power?: number;
	heart_rate?: number;
	speed?: number;
	cadence?: number;
	altitude?: number;
	position_lat?: number;
	position_long?: number;
}

interface ParseResult {
	telemetry: TelemetryRecord[];
	gpsPoints?: RoutePoint[];
}

export function parseFitFile(
	fitData: ArrayBuffer,
	extractGps: boolean = false
): Promise<ParseResult> {
	return new Promise((resolve, reject) => {
		const parser = new FitParser({ force: true });

		const buf = Buffer.from(fitData);
		const bytes = new Uint8Array(fitData);
		console.log(`  FIT parser input: ${buf.byteLength} bytes, first 16: ${Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

		// Quick sanity check: if it looks like JSON, log it
		if (bytes[0] === 0x7b) { // '{'
			const preview = buf.toString('utf8', 0, Math.min(500, buf.byteLength));
			console.log(`  WARNING: Data looks like JSON, not FIT: ${preview}`);
			reject(new Error('Data is JSON, not a FIT file'));
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		parser.parse(buf, (error: unknown, data: any) => {
			if (error) {
				console.log(`  FIT parse error:`, error);
				reject(new Error(`Failed to parse FIT file: ${error}`));
				return;
			}
			if (!data?.records?.length) {
				console.log(`  FIT parsed OK but no records. Keys:`, data ? Object.keys(data) : 'null');
				reject(new Error('FIT file has no records'));
				return;
			}
			console.log(`  FIT parsed: ${data.records.length} records`);

			const records = data.records as FitRecord[];
			const telemetry: TelemetryRecord[] = [];
			const gpsPoints: RoutePoint[] = [];

			// Find the first timestamp to calculate elapsed time
			let startTime: number | null = null;

			for (const rec of records) {
				// Calculate elapsed time
				let elapsed: number;
				if (rec.elapsed_time !== undefined) {
					elapsed = rec.elapsed_time;
				} else if (rec.timer_time !== undefined) {
					elapsed = rec.timer_time;
				} else if (rec.timestamp) {
					const ts = new Date(rec.timestamp).getTime();
					if (startTime === null) startTime = ts;
					elapsed = (ts - startTime) / 1000;
				} else {
					continue;
				}

				if (elapsed < 0) continue;

				const record: TelemetryRecord = {
					elapsed: Math.round(elapsed),
					distance: rec.distance || 0,
					power: rec.power || 0,
					heartRate: rec.heart_rate || 0,
					speed: rec.speed || 0,
					cadence: rec.cadence || 0,
					altitude: rec.altitude || 0
				};

				telemetry.push(record);

				// Extract GPS if requested and available
				if (
					extractGps &&
					rec.position_lat !== undefined &&
					rec.position_long !== undefined &&
					rec.position_lat !== null &&
					rec.position_long !== null
				) {
					// FIT files store lat/lng in semicircles, convert to degrees
					const lat =
						Math.abs(rec.position_lat) > 180
							? rec.position_lat * (180 / Math.pow(2, 31))
							: rec.position_lat;
					const lng =
						Math.abs(rec.position_long) > 180
							? rec.position_long * (180 / Math.pow(2, 31))
							: rec.position_long;

					gpsPoints.push({
						distance: rec.distance || 0,
						lat,
						lng,
						altitude: rec.altitude || 0
					});
				}
			}

			resolve({
				telemetry,
				gpsPoints: extractGps ? gpsPoints : undefined
			});
		});
	});
}
