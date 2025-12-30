import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioContextService {
  private audioContext: AudioContext | null = null;

  constructor() {}

  /**
   * Gets or creates the AudioContext singleton instance
   */
  getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /**
   * Resumes the audio context if it was suspended (required for browser autoplay policies)
   */
  async resume(): Promise<void> {
    const context = this.getContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  /**
   * Suspends the audio context to save resources
   */
  async suspend(): Promise<void> {
    const context = this.getContext();
    if (context.state === 'running') {
      await context.suspend();
    }
  }

  /**
   * Gets the current time of the audio context
   */
  getCurrentTime(): number {
    return this.getContext().currentTime;
  }

  /**
   * Gets the sample rate of the audio context
   */
  getSampleRate(): number {
    return this.getContext().sampleRate;
  }
}
