import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AudioTrack } from '../../../core/models/audio-track.model';
import { AudioClip } from '../../../core/models/audio-clip.model';
import { Effect, EffectType } from '../../../core/models/effect.model';
import { v4 as uuidv4 } from 'uuid';
import { generateWaveformData } from '../../../shared/utils/waveform-generator.util';

@Injectable({
  providedIn: 'root'
})
export class ClipManagerService {
  private tracksSubject = new BehaviorSubject<AudioTrack[]>([]);
  tracks$: Observable<AudioTrack[]> = this.tracksSubject.asObservable();

  constructor() {
    // Initialize with one default track
    this.initializeDefaultTrack();
  }

  /**
   * Initialize a default track
   */
  private initializeDefaultTrack(): void {
    const defaultTrack: AudioTrack = {
      id: uuidv4(),
      name: 'Track 1',
      volume: 1.0,
      muted: false,
      solo: false,
      armed: false,
      clips: [],
      effects: [],
      color: '#3498db'
    };
    this.tracksSubject.next([defaultTrack]);
  }

  /**
   * Gets all tracks
   */
  getTracks(): AudioTrack[] {
    return this.tracksSubject.value;
  }

  /**
   * Gets a track by ID
   */
  getTrack(trackId: string): AudioTrack | undefined {
    return this.tracksSubject.value.find(track => track.id === trackId);
  }

  /**
   * Adds a new clip to a track
   */
  addClip(trackId: string, clip: AudioClip): void {
    const tracks = this.tracksSubject.value;
    const trackIndex = tracks.findIndex(t => t.id === trackId);

    if (trackIndex !== -1) {
      const updatedTracks = [...tracks];
      updatedTracks[trackIndex] = {
        ...updatedTracks[trackIndex],
        clips: [...updatedTracks[trackIndex].clips, clip]
      };
      this.tracksSubject.next(updatedTracks);
    }
  }

  /**
   * Creates a new clip with the given audio buffer
   */
  createClip(trackId: string, audioBuffer: AudioBuffer, name: string, startTime: number = 0): AudioClip {
    // Generate waveform data for visualization
    const waveformData = generateWaveformData(audioBuffer, 200);

    const clip: AudioClip = {
      id: uuidv4(),
      trackId,
      name,
      startTime,
      duration: audioBuffer.duration,
      trimStart: 0,
      trimEnd: 0,
      audioBuffer,
      waveformData,
      color: '#9b59b6'
    };

    this.addClip(trackId, clip);
    return clip;
  }

  /**
   * Removes a clip from a track
   */
  removeClip(clipId: string): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.id !== clipId)
    }));
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Updates a clip's position
   */
  updateClipPosition(clipId: string, startTime: number): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, startTime } : clip
      )
    }));
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Gets the first track (for simple single-track mode)
   */
  getFirstTrack(): AudioTrack | undefined {
    return this.tracksSubject.value[0];
  }

  /**
   * Clears all clips from all tracks
   */
  clearAllClips(): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => ({
      ...track,
      clips: []
    }));
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Adds a new track
   */
  addTrack(): AudioTrack {
    const tracks = this.tracksSubject.value;
    const trackNumber = tracks.length + 1;
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

    const newTrack: AudioTrack = {
      id: uuidv4(),
      name: `Track ${trackNumber}`,
      volume: 1.0,
      muted: false,
      solo: false,
      armed: false,
      clips: [],
      effects: [],
      color: colors[trackNumber % colors.length]
    };

    this.tracksSubject.next([...tracks, newTrack]);
    return newTrack;
  }

  /**
   * Arms a track for recording (disarms all others)
   */
  armTrack(trackId: string): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => ({
      ...track,
      armed: track.id === trackId
    }));
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Toggles the armed state of a track
   */
  toggleTrackArmed(trackId: string): void {
    const tracks = this.tracksSubject.value;
    const track = tracks.find(t => t.id === trackId);

    if (track) {
      if (track.armed) {
        // Disarm this track
        const updatedTracks = tracks.map(t => ({
          ...t,
          armed: false
        }));
        this.tracksSubject.next(updatedTracks);
      } else {
        // Arm this track, disarm all others
        this.armTrack(trackId);
      }
    }
  }

  /**
   * Gets the currently armed track
   */
  getArmedTrack(): AudioTrack | undefined {
    return this.tracksSubject.value.find(track => track.armed);
  }

  /**
   * Removes a track
   */
  removeTrack(trackId: string): void {
    const tracks = this.tracksSubject.value;
    // Don't allow removing the last track
    if (tracks.length <= 1) {
      return;
    }
    const updatedTracks = tracks.filter(track => track.id !== trackId);
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Updates a track's volume (0-1)
   */
  updateTrackVolume(trackId: string, volume: number): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, volume: Math.max(0, Math.min(1, volume)) } : track
    );
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Toggles a track's mute state
   */
  toggleTrackMute(trackId: string): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, muted: !track.muted } : track
    );
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Toggles a track's solo state
   */
  toggleTrackSolo(trackId: string): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, solo: !track.solo } : track
    );
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Adds or updates an effect on a track
   */
  updateTrackEffect(trackId: string, effectType: EffectType, parameters: Record<string, number>, enabled: boolean = true): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => {
      if (track.id !== trackId) return track;

      // Find existing effect or create new one
      const existingEffectIndex = track.effects.findIndex(e => e.type === effectType);
      const effects = [...track.effects];

      if (existingEffectIndex >= 0) {
        // Update existing effect
        effects[existingEffectIndex] = {
          ...effects[existingEffectIndex],
          parameters,
          enabled
        };
      } else {
        // Add new effect
        effects.push({
          id: uuidv4(),
          type: effectType,
          enabled,
          parameters
        });
      }

      return { ...track, effects };
    });

    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Toggles an effect on/off for a track
   */
  toggleTrackEffect(trackId: string, effectType: EffectType): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => {
      if (track.id !== trackId) return track;

      const effects = track.effects.map(effect =>
        effect.type === effectType ? { ...effect, enabled: !effect.enabled } : effect
      );

      return { ...track, effects };
    });

    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Gets an effect from a track
   */
  getTrackEffect(trackId: string, effectType: EffectType): Effect | undefined {
    const track = this.getTrack(trackId);
    return track?.effects.find(e => e.type === effectType);
  }
}
