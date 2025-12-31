import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AudioContextService } from './audio-context.service';
import { ClipManagerService } from '../../features/timeline/services/clip-manager.service';
import { EffectsProcessorService } from './effects-processor.service';
import { AudioTrack } from '../models/audio-track.model';
import { AudioClip } from '../models/audio-clip.model';
import { EffectType } from '../models/effect.model';

export enum PlaybackState {
  Idle = 'idle',
  Playing = 'playing',
  Paused = 'paused'
}

interface TrackPlaybackNode {
  trackId: string;
  gainNode: GainNode;
  analyser: AnalyserNode;
  sources: AudioBufferSourceNode[];
}

@Injectable({
  providedIn: 'root'
})
export class PlaybackService {
  private audioContextService = inject(AudioContextService);
  private clipManagerService = inject(ClipManagerService);
  private effectsProcessorService = inject(EffectsProcessorService);

  private playbackStateSubject = new BehaviorSubject<PlaybackState>(PlaybackState.Idle);
  private currentTimeSubject = new BehaviorSubject<number>(0);
  private masterVolumeSubject = new BehaviorSubject<number>(0.8); // Default 80%
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private animationFrameId: number | null = null;
  private trackPlaybackNodes: TrackPlaybackNode[] = [];
  private masterGainNode: GainNode | null = null;

  playbackState$: Observable<PlaybackState> = this.playbackStateSubject.asObservable();
  currentTime$: Observable<number> = this.currentTimeSubject.asObservable();
  masterVolume$: Observable<number> = this.masterVolumeSubject.asObservable();

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

    // Get current playhead position BEFORE stopping (stop() resets it to 0)
    const playheadTime = this.currentTimeSubject.value;

    // Stop any currently playing audio
    this.stop();

    const audioContext = this.audioContextService.getContext();
    const tracks = this.clipManagerService.getTracks();

    // Create master gain node for overall volume control
    this.masterGainNode = audioContext.createGain();
    this.masterGainNode.gain.value = this.masterVolumeSubject.value;
    this.masterGainNode.connect(audioContext.destination);

    // Check if any tracks have solo enabled
    const hasSoloTracks = tracks.some(track => track.solo);

    // Create audio graph for each track
    this.trackPlaybackNodes = tracks.map(track => {
      const gainNode = audioContext.createGain();

      // Determine if this track should be audible
      const shouldPlay = hasSoloTracks ? track.solo : !track.muted;

      // Set gain based on track volume and mute/solo state
      gainNode.gain.value = shouldPlay ? track.volume : 0;

      // Create effects chain
      // Effects are applied in reverse order (last effect connects to output)
      // Signal flow: source → boost → distortion → flanger → delay → reverb → tremolo → gain → pan → master gain → destination
      let effectsChain: AudioNode = gainNode;

      // Apply tremolo effect if enabled (last in chain - amplitude modulation)
      const tremoloEffect = track.effects.find(e => e.type === EffectType.Tremolo);
      if (tremoloEffect && tremoloEffect.enabled) {
        const rate = tremoloEffect.parameters['rate'] || 50;
        const depth = tremoloEffect.parameters['depth'] || 50;
        const tremoloNode = this.effectsProcessorService.createTremolo(rate, depth);

        tremoloNode.connect(effectsChain);
        effectsChain = tremoloNode;
      }

      // Apply reverb effect if enabled
      const reverbEffect = track.effects.find(e => e.type === EffectType.Reverb);
      if (reverbEffect && reverbEffect.enabled) {
        const roomSize = reverbEffect.parameters['roomSize'] || 50;
        const damping = reverbEffect.parameters['damping'] || 50;
        const wetDry = reverbEffect.parameters['wetDry'] || 30;
        const reverbNodes = this.effectsProcessorService.createReverb(roomSize, damping, wetDry);

        reverbNodes.output.connect(effectsChain);
        effectsChain = reverbNodes.input;
      }

      // Apply delay effect if enabled
      const delayEffect = track.effects.find(e => e.type === EffectType.Delay);
      if (delayEffect && delayEffect.enabled) {
        const time = (delayEffect.parameters['time'] || 30) / 100; // Convert 0-100 to 0-1 seconds
        const feedback = delayEffect.parameters['feedback'] || 30;
        const wetDry = delayEffect.parameters['wetDry'] || 50;
        const delayNodes = this.effectsProcessorService.createDelay(time, feedback, wetDry);

        delayNodes.output.connect(effectsChain);
        effectsChain = delayNodes.input;
      }

      // Apply flanger effect if enabled
      const flangerEffect = track.effects.find(e => e.type === EffectType.Flanger);
      if (flangerEffect && flangerEffect.enabled) {
        const rate = flangerEffect.parameters['rate'] || 50;
        const depth = flangerEffect.parameters['depth'] || 50;
        const feedback = flangerEffect.parameters['feedback'] || 50;
        const flangerNodes = this.effectsProcessorService.createFlanger(rate, depth, feedback);

        flangerNodes.output.connect(effectsChain);
        effectsChain = flangerNodes.input;
      }

      // Apply distortion effect if enabled
      const distortionEffect = track.effects.find(e => e.type === EffectType.Distortion);
      if (distortionEffect && distortionEffect.enabled) {
        const distortionAmount = distortionEffect.parameters['amount'] || 50;
        const distortionNode = this.effectsProcessorService.createDistortion(distortionAmount);

        distortionNode.connect(effectsChain);
        effectsChain = distortionNode;
      }

      // Apply boost effect if enabled (first in chain - pre-amp)
      const boostEffect = track.effects.find(e => e.type === EffectType.Boost);
      if (boostEffect && boostEffect.enabled) {
        const gain = boostEffect.parameters['gain'] || 50;
        const boostNode = this.effectsProcessorService.createBoost(gain);

        boostNode.connect(effectsChain);
        effectsChain = boostNode;
      }

      // Create and apply pan node
      const panNode = audioContext.createStereoPanner();
      panNode.pan.value = track.pan;

      // Create analyser node for VU meter
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      // Connect final chain: gain → pan → analyser → master gain → destination
      gainNode.connect(panNode);
      panNode.connect(analyser);
      analyser.connect(this.masterGainNode!);

      // Create source nodes for each clip in the track
      const sources: AudioBufferSourceNode[] = track.clips
        .map(clip => {
          // Calculate visible duration and offset for trimmed clips
          const visibleDuration = clip.duration - clip.trimStart - clip.trimEnd;
          const clipEndTime = clip.startTime + visibleDuration;

          // Skip clips that have already finished playing at the current playhead position
          if (clipEndTime <= playheadTime) {
            return null;
          }

          const source = audioContext.createBufferSource();
          source.buffer = clip.audioBuffer;

          // Connect to the effects chain (or directly to gain if no effects)
          source.connect(effectsChain);

          // Calculate when to start the clip relative to current time
          let whenToStart: number;
          let offset: number;
          let duration: number;

          if (clip.startTime <= playheadTime) {
            // Clip should already be playing - start immediately
            whenToStart = audioContext.currentTime;
            // Offset into the buffer based on how far into the clip we are
            const timeIntoClip = playheadTime - clip.startTime;
            offset = clip.trimStart + timeIntoClip;
            // Duration is remaining visible duration
            duration = visibleDuration - timeIntoClip;
          } else {
            // Clip starts in the future - schedule it normally
            whenToStart = audioContext.currentTime + (clip.startTime - playheadTime);
            offset = clip.trimStart;
            duration = visibleDuration;
          }

          // Schedule the clip
          // source.start(when, offset, duration) - plays only the visible portion
          source.start(whenToStart, offset, duration);

          return source;
        })
        .filter((source): source is AudioBufferSourceNode => source !== null);

      return {
        trackId: track.id,
        gainNode,
        analyser,
        sources
      };
    });

    // Start playback state - account for playhead offset
    this.startTime = audioContext.currentTime - playheadTime;
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

  /**
   * Seeks to a specific time position (in seconds)
   * Stops playback and updates the current time
   */
  seek(time: number): void {
    // Stop any current playback
    const wasPlaying = this.playbackStateSubject.value === PlaybackState.Playing;
    this.stop();

    // Set the current time
    this.currentTimeSubject.next(Math.max(0, time));

    // Note: If we wanted to continue playback from the new position,
    // we could restart playback here. For now, seeking stops playback.
  }

  /**
   * Gets the current playback time
   */
  getCurrentTime(): number {
    return this.currentTimeSubject.value;
  }

  /**
   * Gets the current master volume (0-1)
   */
  getMasterVolume(): number {
    return this.masterVolumeSubject.value;
  }

  /**
   * Sets the master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterVolumeSubject.next(clampedVolume);

    // Update the master gain node if it exists and is currently playing
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = clampedVolume;
    }
  }

  /**
   * Gets the analyser node for a specific track (for VU meter)
   */
  getTrackAnalyser(trackId: string): AnalyserNode | null {
    const trackNode = this.trackPlaybackNodes.find(node => node.trackId === trackId);
    return trackNode?.analyser || null;
  }
}
