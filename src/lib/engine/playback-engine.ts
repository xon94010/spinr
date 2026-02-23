export type TickCallback = (currentTime: number) => void;

export class PlaybackEngine {
	private playing = false;
	private currentTime = 0;
	private speed = 1;
	private duration = 0;
	private lastFrameTime: number | null = null;
	private rafId: number | null = null;
	private onTick: TickCallback;

	constructor(duration: number, onTick: TickCallback) {
		this.duration = duration;
		this.onTick = onTick;
	}

	play() {
		if (this.playing) return;
		this.playing = true;
		this.lastFrameTime = null;
		this.loop();
	}

	pause() {
		this.playing = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	toggle() {
		if (this.playing) this.pause();
		else this.play();
	}

	seek(time: number) {
		this.currentTime = Math.max(0, Math.min(time, this.duration));
		this.lastFrameTime = null;
		this.onTick(this.currentTime);
	}

	setSpeed(speed: number) {
		this.speed = speed;
	}

	getTime() {
		return this.currentTime;
	}

	isPlaying() {
		return this.playing;
	}

	getSpeed() {
		return this.speed;
	}

	destroy() {
		this.pause();
	}

	private loop = () => {
		if (!this.playing) return;

		const now = performance.now();
		if (this.lastFrameTime !== null) {
			const deltaMs = now - this.lastFrameTime;
			const deltaSec = (deltaMs / 1000) * this.speed;
			this.currentTime += deltaSec;

			if (this.currentTime >= this.duration) {
				this.currentTime = this.duration;
				this.playing = false;
				this.onTick(this.currentTime);
				return;
			}
		}
		this.lastFrameTime = now;
		this.onTick(this.currentTime);
		this.rafId = requestAnimationFrame(this.loop);
	};
}
