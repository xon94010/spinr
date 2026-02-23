<script lang="ts">
	let {
		playing,
		currentTime,
		duration,
		speed,
		onToggle,
		onSeek,
		onSpeedChange
	}: {
		playing: boolean;
		currentTime: number;
		duration: number;
		speed: number;
		onToggle: () => void;
		onSeek: (time: number) => void;
		onSpeedChange: (speed: number) => void;
	} = $props();

	const speeds = [1, 2, 4, 10, 20];

	function formatTime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) {
			return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		}
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function handleRangeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onSeek(parseFloat(target.value));
	}

	function seekRelative(delta: number) {
		onSeek(Math.max(0, Math.min(currentTime + delta, duration)));
	}

	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

			switch (e.code) {
				case 'Space':
					e.preventDefault();
					onToggle();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					seekRelative(-10);
					break;
				case 'ArrowRight':
					e.preventDefault();
					seekRelative(10);
					break;
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	let progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
</script>

<div class="flex items-center gap-3 px-4 py-3 bg-card border-t border-border">
	<!-- Play/Pause -->
	<button
		onclick={onToggle}
		class="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
		title={playing ? 'Pause (Space)' : 'Play (Space)'}
	>
		{#if playing}
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
				<rect x="2" y="1" width="3.5" height="12" rx="1" />
				<rect x="8.5" y="1" width="3.5" height="12" rx="1" />
			</svg>
		{:else}
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
				<path d="M3 1.5v11l9-5.5z" />
			</svg>
		{/if}
	</button>

	<!-- Speed buttons -->
	<div class="flex gap-1">
		{#each speeds as s}
			<button
				onclick={() => onSpeedChange(s)}
				class="px-2 py-1 text-xs rounded font-mono transition-colors {speed === s
					? 'bg-primary text-primary-foreground'
					: 'bg-secondary text-secondary-foreground hover:bg-accent'}"
			>
				{s}x
			</button>
		{/each}
	</div>

	<!-- Timeline scrubber -->
	<div class="flex-1 relative mx-2">
		<input
			type="range"
			min="0"
			max={duration}
			step="0.1"
			value={currentTime}
			oninput={handleRangeInput}
			class="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer
				[&::-webkit-slider-thumb]:appearance-none
				[&::-webkit-slider-thumb]:w-3.5
				[&::-webkit-slider-thumb]:h-3.5
				[&::-webkit-slider-thumb]:bg-primary
				[&::-webkit-slider-thumb]:rounded-full
				[&::-webkit-slider-thumb]:cursor-pointer"
			style="background: linear-gradient(to right, var(--color-primary) {progress}%, var(--color-secondary) {progress}%)"
		/>
	</div>

	<!-- Time display -->
	<span class="text-sm font-mono text-muted-foreground whitespace-nowrap shrink-0">
		{formatTime(currentTime)} / {formatTime(duration)}
	</span>
</div>
