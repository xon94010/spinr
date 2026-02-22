<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		username: string;
		password: string;
		rememberMe: boolean;
		error: string | null;
		loading: boolean;
		onsubmit: () => void;
	}

	let {
		username = $bindable(),
		password = $bindable(),
		rememberMe = $bindable(),
		error,
		loading,
		onsubmit
	}: Props = $props();
</script>

<div class="max-w-sm mx-auto pt-20">
	<div class="text-center mb-10">
		<img src="/logo.png" alt="spinr" class="h-44 w-auto mx-auto mb-4" />
		<p class="text-muted-foreground">Your personal cycling stats dashboard</p>
	</div>

	<Card.Root>
		<Card.Content class="pt-6">
			<form onsubmit={(e) => { e.preventDefault(); onsubmit(); }} class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" type="email" bind:value={username} placeholder="your@email.com" />
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input id="password" type="password" bind:value={password} placeholder="••••••••" />
				</div>

				<label class="flex items-center gap-3 cursor-pointer">
					<input type="checkbox" bind:checked={rememberMe} class="rounded border-border" />
					<span class="text-sm text-muted-foreground">Remember me for 30 days</span>
				</label>

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={loading || !username || !password}>
					{loading ? 'Connecting...' : 'Connect to Zwift'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
