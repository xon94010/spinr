<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<div class="flex flex-col items-center gap-4 py-12">
	<div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
	<p class="text-muted-foreground text-sm">{message}</p>
</div>
