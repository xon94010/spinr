<script lang="ts">
	let {
		value,
		unit = '',
		label,
		size = 'md'
	}: {
		value: string | number;
		unit?: string;
		label: string;
		size?: 'sm' | 'md';
	} = $props();

	const valueClass = $derived(size === 'sm' ? 'text-xl' : 'text-3xl');
</script>

<div>
	<div class="flex items-baseline gap-1">
		<span class="{valueClass} font-semibold text-white tabular-nums">{value}</span>
		{#if unit}
			<span class="text-sm text-[color:var(--color-text-subtle)]">{unit}</span>
		{/if}
	</div>
	<p class="text-sm text-[color:var(--color-text-muted)] mt-1">{label}</p>
</div>
