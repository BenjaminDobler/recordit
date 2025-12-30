import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AudioContextService } from './audio-context.service';

export enum PlaybackState {
  Idle = 'idle',
  Playing = 'playing',
  Paused = 'paused'
}

@Injectable({
  providedIn: 'root'
})
export class PlaybackService {
  private playbackStateSubject = new BehaviorSubject<PlaybackState>(PlaybackState.Idle);
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;

  playbackState$: Observable<PlaybackState> = this.playbackStateSubject.asObservable();

  constructor(private audioContextService: AudioContextService) {}

  /**
   * Converts a Blob to an AudioBuffer
   */
  async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = this.audioContextService.getContext();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Plays an audio buffer
   */
  async play(buffer?: AudioBuffer): Promise<void> {
    // Resume audio context if suspended (required for browser autoplay policies)
    await this.audioContextService.resume();

    // Use provided buffer or the current buffer
    if (buffer) {
      this.currentBuffer = buffer;
    }

    if (!this.currentBuffer) {
      console.error('No audio buffer to play');
      return;
    }

    // Stop any currently playing audio
    this.stop();

    // Create a new source node
    const audioContext = this.audioContextService.getContext();
    this.currentSource = audioContext.createBufferSource();
    this.currentSource.buffer = this.currentBuffer;
    this.currentSource.connect(audioContext.destination);

    // Handle playback end
    this.currentSource.onended = () => {
      if (this.playbackStateSubject.value === PlaybackState.Playing) {
        this.playbackStateSubject.next(PlaybackState.Idle);
        this.currentSource = null;
      }
    };

    // Start playback
    this.currentSource.start(0);
    this.startTime = audioContext.currentTime;
    this.playbackStateSubject.next(PlaybackState.Playing);
  }

  /**
   * Stops playback
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    this.playbackStateSubject.next(PlaybackState.Idle);
    this.pauseTime = 0;
  }

  /**
   * Pauses playback (not implemented in Phase 2, reserved for future)
   */
  pause(): void {
    if (this.currentSource && this.playbackStateSubject.value === PlaybackState.Playing) {
      const audioContext = this.audioContextService.getContext();
      this.pauseTime = audioContext.currentTime - this.startTime;
      this.stop();
      this.playbackStateSubject.next(PlaybackState.Paused);
    }
  }

  /**
   * Gets the current playback state
   */
  getPlaybackState(): PlaybackState {
    return this.playbackStateSubject.value;
  }

  /**
   * Sets the current audio buffer for playback
   */
  setAudioBuffer(buffer: AudioBuffer): void {
    this.currentBuffer = buffer;
  }

  /**
   * Gets the current audio buffer
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.currentBuffer;
  }
}
