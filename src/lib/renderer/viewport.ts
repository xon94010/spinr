import type { RoutePoint } from '$lib/types/race';

export class Viewport {
	private offsetX = 0;
	private offsetY = 0;
	private scale = 1;
	private width = 0;
	private height = 0;

	// Bounds of the route in projected coordinates
	private minX = 0;
	private maxX = 0;
	private minY = 0;
	private maxY = 0;

	// Equirectangular projection constants
	private centerLat = 0;
	private cosLat = 1;

	setSize(width: number, height: number) {
		this.width = width;
		this.height = height;
	}

	/**
	 * Initialize the viewport from a route polyline.
	 * Projects lat/lng to x/y using equirectangular projection.
	 */
	fitRoute(route: RoutePoint[]) {
		if (route.length === 0) return;

		// Find center latitude for equirectangular correction
		let sumLat = 0;
		for (const p of route) sumLat += p.lat;
		this.centerLat = sumLat / route.length;
		this.cosLat = Math.cos((this.centerLat * Math.PI) / 180);

		// Project and find bounds
		this.minX = Infinity;
		this.maxX = -Infinity;
		this.minY = Infinity;
		this.maxY = -Infinity;

		for (const p of route) {
			const { x, y } = this.project(p.lat, p.lng);
			this.minX = Math.min(this.minX, x);
			this.maxX = Math.max(this.maxX, x);
			this.minY = Math.min(this.minY, y);
			this.maxY = Math.max(this.maxY, y);
		}

		// Add padding
		const routeWidth = this.maxX - this.minX;
		const routeHeight = this.maxY - this.minY;
		const pad = Math.max(routeWidth, routeHeight) * 0.1;
		this.minX -= pad;
		this.maxX += pad;
		this.minY -= pad;
		this.maxY += pad;

		this.resetView();
	}

	resetView() {
		const routeWidth = this.maxX - this.minX;
		const routeHeight = this.maxY - this.minY;

		if (routeWidth === 0 || routeHeight === 0) return;

		// Fit route to canvas with padding
		const scaleX = this.width / routeWidth;
		const scaleY = this.height / routeHeight;
		this.scale = Math.min(scaleX, scaleY);

		// Center the route
		this.offsetX = (this.width - routeWidth * this.scale) / 2 - this.minX * this.scale;
		this.offsetY = (this.height - routeHeight * this.scale) / 2 - this.minY * this.scale;
	}

	/**
	 * Equirectangular projection: lat/lng -> x/y in projected space
	 */
	project(lat: number, lng: number): { x: number; y: number } {
		const x = lng * this.cosLat;
		const y = -lat; // Flip y so north is up
		return { x, y };
	}

	/**
	 * Convert projected coordinates to canvas pixel coordinates.
	 */
	toCanvas(lat: number, lng: number): { x: number; y: number } {
		const { x, y } = this.project(lat, lng);
		return {
			x: x * this.scale + this.offsetX,
			y: y * this.scale + this.offsetY
		};
	}

	/**
	 * Convert canvas pixel coordinates back to projected coordinates.
	 */
	fromCanvas(cx: number, cy: number): { x: number; y: number } {
		return {
			x: (cx - this.offsetX) / this.scale,
			y: (cy - this.offsetY) / this.scale
		};
	}

	pan(dx: number, dy: number) {
		this.offsetX += dx;
		this.offsetY += dy;
	}

	zoom(factor: number, centerX: number, centerY: number) {
		const before = this.fromCanvas(centerX, centerY);
		this.scale *= factor;
		const after = this.fromCanvas(centerX, centerY);
		this.offsetX += (after.x - before.x) * this.scale;
		this.offsetY += (after.y - before.y) * this.scale;
	}

	/**
	 * Center the viewport on a specific lat/lng position.
	 */
	centerOn(lat: number, lng: number) {
		const { x, y } = this.project(lat, lng);
		this.offsetX = this.width / 2 - x * this.scale;
		this.offsetY = this.height / 2 - y * this.scale;
	}

	getScale() {
		return this.scale;
	}

	getWidth() {
		return this.width;
	}

	getHeight() {
		return this.height;
	}
}
