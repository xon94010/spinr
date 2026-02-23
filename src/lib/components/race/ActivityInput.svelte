<script lang="ts">
	let { onSubmit }: { onSubmit: (activityId: string) => void } = $props();

	let activityId = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = activityId.trim();
		if (trimmed) onSubmit(trimmed);
	}
</script>

<form onsubmit={handleSubmit} class="flex gap-3 w-full max-w-lg">
	<input
		type="text"
		bind:value={activityId}
		class="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
		placeholder="Enter Activity ID"
	/>
	<button
		type="submit"
		disabled={!activityId.trim()}
		class="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
	>
		Load Race
	</button>
</form>
