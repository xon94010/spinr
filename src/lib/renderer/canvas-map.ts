import type { RoutePoint } from '$lib/types/race';
import type { RiderSnapshot } from '$lib/types/playback';
import { Viewport } from './viewport';
import { ROUTE_COLOR, ROUTE_STROKE_WIDTH, SELECTED_RING_COLOR, FOLLOW_RING_COLOR } from './colors';

interface ProjectedRider extends RiderSnapshot {
	cx: number;
	cy: number;
}

export class CanvasMap {
	private ctx: CanvasRenderingContext2D;
	private viewport: Viewport;
	private route: RoutePoint[] = [];

	constructor(ctx: CanvasRenderingContext2D, viewport: Viewport) {
		this.ctx = ctx;
		this.viewport = viewport;
	}

	setRoute(route: RoutePoint[]) {
		this.route = route;
	}

	render(
		riders: RiderSnapshot[],
		selectedId: number | null,
		followId: number | null
	) {
		const ctx = this.ctx;
		const w = this.viewport.getWidth();
		const h = this.viewport.getHeight();

		// Clear
		ctx.fillStyle = '#0a0f1a';
		ctx.fillRect(0, 0, w, h);

		// Draw route polyline
		if (this.route.length > 1) {
			ctx.beginPath();
			const first = this.viewport.toCanvas(this.route[0].lat, this.route[0].lng);
			ctx.moveTo(first.x, first.y);
			for (let i = 1; i < this.route.length; i++) {
				const p = this.viewport.toCanvas(this.route[i].lat, this.route[i].lng);
				ctx.lineTo(p.x, p.y);
			}
			ctx.strokeStyle = ROUTE_COLOR;
			ctx.lineWidth = ROUTE_STROKE_WIDTH;
			ctx.stroke();
		}

		// Project all riders
		const projected: ProjectedRider[] = riders.map((r) => {
			const { x, y } = this.viewport.toCanvas(r.lat, r.lng);
			return { ...r, cx: x, cy: y };
		});

		// Draw rider dots
		const dotRadius = 5;
		const selectedRider = projected.find((r) => r.riderId === selectedId);
		const followRider = projected.find((r) => r.riderId === followId);
		const meRider = projected.find((r) => r.isMe);

		// Draw non-selected/non-me riders first
		for (const rider of projected) {
			if (rider.riderId === selectedId || rider.riderId === followId || rider.isMe) continue;
			this.drawRiderDot(rider.cx, rider.cy, rider.color, dotRadius, false, false);
		}

		// Draw follow rider
		if (followRider && followRider.riderId !== selectedId && !followRider.isMe) {
			this.drawRiderDot(followRider.cx, followRider.cy, followRider.color, dotRadius + 1, false, true);
		}

		// Draw "me" rider as a gold star
		if (meRider) {
			const isSelected = meRider.riderId === selectedId;
			const isFollowed = meRider.riderId === followId;
			if (isSelected || isFollowed) {
				ctx.beginPath();
				ctx.arc(meRider.cx, meRider.cy, dotRadius + 5, 0, Math.PI * 2);
				ctx.strokeStyle = isSelected ? SELECTED_RING_COLOR : FOLLOW_RING_COLOR;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
			this.drawStar(meRider.cx, meRider.cy, dotRadius + 2, '#fbbf24');
		}

		// Draw selected rider on top (if not me)
		if (selectedRider && !selectedRider.isMe) {
			this.drawRiderDot(
				selectedRider.cx, selectedRider.cy, selectedRider.color,
				dotRadius + 2, true, selectedRider.riderId === followId
			);
		}

		// Only show label for "me"
		if (meRider) {
			ctx.font = 'bold 11px Inter, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#fbbf24';
			ctx.fillText(meRider.name.split(' ')[0], meRider.cx, meRider.cy - dotRadius - 6);
		}
	}

	private drawRiderDot(
		x: number,
		y: number,
		color: string,
		radius: number,
		selected: boolean,
		followed: boolean
	) {
		const ctx = this.ctx;

		if (selected || followed) {
			ctx.beginPath();
			ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
			ctx.strokeStyle = selected ? SELECTED_RING_COLOR : FOLLOW_RING_COLOR;
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
	}

	private drawStar(x: number, y: number, radius: number, color: string) {
		const ctx = this.ctx;
		const spikes = 5;
		const outerRadius = radius;
		const innerRadius = radius * 0.45;

		ctx.beginPath();
		for (let i = 0; i < spikes * 2; i++) {
			const r = i % 2 === 0 ? outerRadius : innerRadius;
			const angle = (i * Math.PI) / spikes - Math.PI / 2;
			const px = x + Math.cos(angle) * r;
			const py = y + Math.sin(angle) * r;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
		ctx.strokeStyle = '#92400e';
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	/**
	 * Find the rider closest to a canvas point, within a max pixel distance.
	 */
	hitTest(
		cx: number,
		cy: number,
		riders: RiderSnapshot[],
		maxDist = 20
	): RiderSnapshot | null {
		let closest: RiderSnapshot | null = null;
		let closestDist = maxDist;

		for (const rider of riders) {
			const p = this.viewport.toCanvas(rider.lat, rider.lng);
			const dx = p.x - cx;
			const dy = p.y - cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < closestDist) {
				closestDist = dist;
				closest = rider;
			}
		}

		return closest;
	}
}
