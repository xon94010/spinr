<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title = '', children }: { title?: string; children: Snippet } = $props();
</script>

<div class="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-2xl p-6">
	{#if title}
		<h3 class="text-xs font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider mb-5">
			{title}
		</h3>
	{/if}
	{@render children()}
</div>
