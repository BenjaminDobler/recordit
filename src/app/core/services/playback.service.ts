import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AudioContextService } from './audio-context.service';
import { ClipManagerService } from '../../features/timeline/services/clip-manager.service';
import { AudioTrack } from '../models/audio-track.model';
import { AudioClip } from '../models/audio-clip.model';

export enum PlaybackState {
  Idle = 'idle',
  Playing = 'playing',
  Paused = 'paused'
}

interface TrackPlaybackNode {
  trackId: string;
  gainNode: GainNode;
  sources: AudioBufferSourceNode[];
}

@Injectable({
  providedIn: 'root'
})
export class PlaybackService {
  private audioContextService = inject(AudioContextService);
  private clipManagerService = inject(ClipManagerService);

  private playbackStateSubject = new BehaviorSubject<PlaybackState>(PlaybackState.Idle);
  private currentTimeSubject = new BehaviorSubject<number>(0);
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private animationFrameId: number | null = null;
  private trackPlaybackNodes: TrackPlaybackNode[] = [];

  playbackState$: Observable<PlaybackState> = this.playbackStateSubject.asObservable();
  currentTime$: Observable<number> = this.currentTimeSubject.asObservable();

  /**
   * Converts a Blob to an AudioBuffer
   */
  async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = this.audioContextService.getContext();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Plays all tracks with mixing
   */
  async playAllTracks(): Promise<void> {
    // Resume audio context if suspended (required for browser autoplay policies)
    await this.audioContextService.resume();

    // Stop any currently playing audio
    this.stop();

    const audioContext = this.audioContextService.getContext();
    const tracks = this.clipManagerService.getTracks();

    // Check if any tracks have solo enabled
    const hasSoloTracks = tracks.some(track => track.solo);

    // Create audio graph for each track
    this.trackPlaybackNodes = tracks.map(track => {
      const gainNode = audioContext.createGain();

      // Determine if this track should be audible
      const shouldPlay = hasSoloTracks ? track.solo : !track.muted;

      // Set gain based on track volume and mute/solo state
      gainNode.gain.value = shouldPlay ? track.volume : 0;

      // Connect to destination
      gainNode.connect(audioContext.destination);

      // Create source nodes for each clip in the track
      const sources: AudioBufferSourceNode[] = track.clips.map(clip => {
        const source = audioContext.createBufferSource();
        source.buffer = clip.audioBuffer;
        source.connect(gainNode);

        // Schedule the clip to start at its position on the timeline
        source.start(audioContext.currentTime + clip.startTime);

        return source;
      });

      return {
        trackId: track.id,
        gainNode,
        sources
      };
    });

    // Start playback state
    this.startTime = audioContext.currentTime;
    this.playbackStateSubject.next(PlaybackState.Playing);

    // Start playhead animation
    this.updatePlaybackTime();
  }

  /**
   * Plays an audio buffer (legacy method for single buffer playback)
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

    // Start playhead animation
    this.updatePlaybackTime();
  }

  /**
   * Stops playback
   */
  stop(): void {
    // Stop animation frame updates
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop and disconnect all track playback nodes (multi-track playback)
    this.trackPlaybackNodes.forEach(node => {
      node.sources.forEach(source => {
        try {
          source.stop();
        } catch (error) {
          // Source might already be stopped
        }
        source.disconnect();
      });
      node.gainNode.disconnect();
    });
    this.trackPlaybackNodes = [];

    // Stop legacy single source (if playing)
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
    this.currentTimeSubject.next(0);
    this.pauseTime = 0;
  }

  /**
   * Updates the current playback time using requestAnimationFrame
   */
  private updatePlaybackTime = (): void => {
    if (this.playbackStateSubject.value === PlaybackState.Playing) {
      const audioContext = this.audioContextService.getContext();
      const elapsed = audioContext.currentTime - this.startTime;
      this.currentTimeSubject.next(elapsed);
      this.animationFrameId = requestAnimationFrame(this.updatePlaybackTime);
    }
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
