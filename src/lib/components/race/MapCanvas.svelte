<script lang="ts">
	import { onMount } from 'svelte';
	import type { RoutePoint } from '$lib/types/race';
	import type { RiderSnapshot } from '$lib/types/playback';
	import { CanvasMap } from '$lib/renderer/canvas-map';
	import { Viewport } from '$lib/renderer/viewport';

	let {
		route,
		riders,
		selectedRiderId,
		followRiderId,
		onSelectRider,
		onFollowRider
	}: {
		route: RoutePoint[];
		riders: RiderSnapshot[];
		selectedRiderId: number | null;
		followRiderId: number | null;
		onSelectRider: (id: number | null) => void;
		onFollowRider: (id: number | null) => void;
	} = $props();

	let canvasEl: HTMLCanvasElement;
	let containerEl: HTMLDivElement;

	let canvasMap: CanvasMap | null = null;
	let viewport: Viewport | null = null;
	let ctx: CanvasRenderingContext2D | null = null;
	let routeFitted = false;
	let dpr = 1;

	// Drag state
	let dragging = false;
	let lastMouseX = 0;
	let lastMouseY = 0;

	function render() {
		if (!canvasMap || !viewport || !ctx) return;

		// Re-apply DPR transform (canvas operations can reset it)
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Fit route on first availability
		if (!routeFitted && route.length > 0 && viewport.getWidth() > 0) {
			viewport.fitRoute(route);
			canvasMap.setRoute(route);
			routeFitted = true;
		}

		// Follow selected rider
		if (followRiderId !== null) {
			const followed = riders.find((r) => r.riderId === followRiderId);
			if (followed) {
				viewport.centerOn(followed.lat, followed.lng);
			}
		}

		canvasMap.render(riders, selectedRiderId, followRiderId);
	}

	onMount(() => {
		ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		dpr = window.devicePixelRatio || 1;
		viewport = new Viewport();
		canvasMap = new CanvasMap(ctx, viewport);

		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width === 0 || height === 0) continue;
				canvasEl.width = width * dpr;
				canvasEl.height = height * dpr;
				canvasEl.style.width = `${width}px`;
				canvasEl.style.height = `${height}px`;
				viewport!.setSize(width, height);
				// Reset routeFitted so it refits on resize
				if (routeFitted) {
					viewport!.fitRoute(route);
				}
			}
		});
		ro.observe(containerEl);

		// Continuous render loop at ~30fps
		let rafId: number;
		const loop = () => {
			render();
			rafId = requestAnimationFrame(loop);
		};
		rafId = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	});

	function handleMouseDown(e: MouseEvent) {
		dragging = true;
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragging || !viewport) return;
		const dx = e.clientX - lastMouseX;
		const dy = e.clientY - lastMouseY;
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
		viewport.pan(dx, dy);
	}

	function handleMouseUp() {
		dragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (!viewport) return;
		const rect = canvasEl.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		viewport.zoom(factor, cx, cy);
	}

	function handleClick(e: MouseEvent) {
		if (!canvasMap) return;
		const rect = canvasEl.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const hit = canvasMap.hitTest(cx, cy, riders);
		onSelectRider(hit?.riderId ?? null);
	}

	function handleDblClick(e: MouseEvent) {
		if (!canvasMap) return;
		const rect = canvasEl.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const hit = canvasMap.hitTest(cx, cy, riders);
		if (hit) {
			onFollowRider(hit.riderId === followRiderId ? null : hit.riderId);
		}
	}
</script>

<div
	bind:this={containerEl}
	class="w-full h-full relative"
>
	<canvas
		bind:this={canvasEl}
		class="absolute inset-0 cursor-grab active:cursor-grabbing"
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
		onclick={handleClick}
		ondblclick={handleDblClick}
	></canvas>
</div>
