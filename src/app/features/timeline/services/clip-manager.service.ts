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
      pan: 0,
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
   * Sets all tracks (used when loading a project)
   */
  setTracks(tracks: AudioTrack[]): void {
    this.tracksSubject.next(tracks);
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
      pan: 0,
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
   * Updates a track's pan (-1 to 1, where -1 is left, 0 is center, 1 is right)
   */
  updateTrackPan(trackId: string, pan: number): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, pan: Math.max(-1, Math.min(1, pan)) } : track
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

      const existingEffect = track.effects.find(e => e.type === effectType);

      if (existingEffect) {
        // Toggle existing effect
        const effects = track.effects.map(effect =>
          effect.type === effectType ? { ...effect, enabled: !effect.enabled } : effect
        );
        return { ...track, effects };
      } else {
        // Create new effect with default parameters
        let defaultParams: Record<string, number> = {};

        if (effectType === EffectType.Distortion) {
          defaultParams = { amount: 50 };
        } else if (effectType === EffectType.Delay) {
          defaultParams = { time: 30, feedback: 30, wetDry: 50 };
        }

        const newEffect: Effect = {
          id: uuidv4(),
          type: effectType,
          enabled: true,
          parameters: defaultParams
        };

        return { ...track, effects: [...track.effects, newEffect] };
      }
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

  /**
   * Updates a clip's trim values (non-destructive trimming)
   */
  updateClipTrim(clipId: string, trimStart: number, trimEnd: number): void {
    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, trimStart, trimEnd } : clip
      )
    }));
    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Splits a clip at the specified time into two clips
   */
  splitClipAtTime(clipId: string, splitTime: number): void {
    const tracks = this.tracksSubject.value;
    let clipToSplit: AudioClip | undefined;
    let trackIndex = -1;

    // Find the clip to split
    for (let i = 0; i < tracks.length; i++) {
      const clip = tracks[i].clips.find(c => c.id === clipId);
      if (clip) {
        clipToSplit = clip;
        trackIndex = i;
        break;
      }
    }

    if (!clipToSplit || trackIndex === -1) return;

    // Calculate split point in the original audio buffer
    const splitPointInBuffer = clipToSplit.trimStart + splitTime;

    // Create first clip (left part)
    const firstClip: AudioClip = {
      id: uuidv4(),
      trackId: clipToSplit.trackId,
      name: `${clipToSplit.name} (1)`,
      startTime: clipToSplit.startTime,
      duration: clipToSplit.duration,
      trimStart: clipToSplit.trimStart,
      trimEnd: clipToSplit.duration - splitPointInBuffer, // Trim from end
      audioBuffer: clipToSplit.audioBuffer,
      waveformData: clipToSplit.waveformData,
      color: clipToSplit.color
    };

    // Create second clip (right part)
    const secondClip: AudioClip = {
      id: uuidv4(),
      trackId: clipToSplit.trackId,
      name: `${clipToSplit.name} (2)`,
      startTime: clipToSplit.startTime + splitTime,
      duration: clipToSplit.duration,
      trimStart: splitPointInBuffer, // Trim from start
      trimEnd: clipToSplit.trimEnd,
      audioBuffer: clipToSplit.audioBuffer,
      waveformData: clipToSplit.waveformData,
      color: clipToSplit.color
    };

    // Replace original clip with two new clips
    const updatedTracks = [...tracks];
    updatedTracks[trackIndex] = {
      ...updatedTracks[trackIndex],
      clips: updatedTracks[trackIndex].clips
        .filter(c => c.id !== clipId)
        .concat([firstClip, secondClip])
        .sort((a, b) => a.startTime - b.startTime)
    };

    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Duplicates a clip and places it immediately after the original
   */
  duplicateClip(clipId: string): void {
    const tracks = this.tracksSubject.value;
    let clipToDuplicate: AudioClip | undefined;
    let trackIndex = -1;

    // Find the clip to duplicate
    for (let i = 0; i < tracks.length; i++) {
      const clip = tracks[i].clips.find(c => c.id === clipId);
      if (clip) {
        clipToDuplicate = clip;
        trackIndex = i;
        break;
      }
    }

    if (!clipToDuplicate || trackIndex === -1) return;

    // Calculate visible duration
    const visibleDuration = clipToDuplicate.duration - clipToDuplicate.trimStart - clipToDuplicate.trimEnd;

    // Create duplicate clip positioned after original
    const duplicateClip: AudioClip = {
      id: uuidv4(),
      trackId: clipToDuplicate.trackId,
      name: `${clipToDuplicate.name} (copy)`,
      startTime: clipToDuplicate.startTime + visibleDuration,
      duration: clipToDuplicate.duration,
      trimStart: clipToDuplicate.trimStart,
      trimEnd: clipToDuplicate.trimEnd,
      audioBuffer: clipToDuplicate.audioBuffer,
      waveformData: clipToDuplicate.waveformData,
      color: clipToDuplicate.color
    };

    // Add duplicate to track
    const updatedTracks = [...tracks];
    updatedTracks[trackIndex] = {
      ...updatedTracks[trackIndex],
      clips: [...updatedTracks[trackIndex].clips, duplicateClip]
        .sort((a, b) => a.startTime - b.startTime)
    };

    this.tracksSubject.next(updatedTracks);
  }

  // Recording preview state
  private recordingPreviewClipId: string | null = null;
  private recordingPreviewTrackId: string | null = null;

  /**
   * Starts a recording preview clip
   */
  startRecordingPreview(trackId: string, startTime: number): void {
    const tracks = this.tracksSubject.value;
    const trackIndex = tracks.findIndex(t => t.id === trackId);

    if (trackIndex === -1) return;

    // Create a temporary preview clip
    const previewClip: AudioClip = {
      id: uuidv4(),
      trackId,
      name: 'Recording...',
      startTime,
      duration: 0,
      trimStart: 0,
      trimEnd: 0,
      audioBuffer: null as any, // Will be replaced when recording finishes
      waveformData: [],
      color: '#e74c3c' // Red color for recording
    };

    this.recordingPreviewClipId = previewClip.id;
    this.recordingPreviewTrackId = trackId;

    // Add preview clip to track
    const updatedTracks = [...tracks];
    updatedTracks[trackIndex] = {
      ...updatedTracks[trackIndex],
      clips: [...updatedTracks[trackIndex].clips, previewClip]
    };

    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Updates the recording preview clip duration
   */
  updateRecordingPreview(duration: number): void {
    if (!this.recordingPreviewClipId || !this.recordingPreviewTrackId) return;

    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => {
      if (track.id === this.recordingPreviewTrackId) {
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === this.recordingPreviewClipId
              ? { ...clip, duration }
              : clip
          )
        };
      }
      return track;
    });

    this.tracksSubject.next(updatedTracks);
  }

  /**
   * Finishes recording preview and replaces with actual clip
   */
  finishRecordingPreview(audioBuffer: AudioBuffer, clipName: string): void {
    if (!this.recordingPreviewClipId || !this.recordingPreviewTrackId) return;

    const tracks = this.tracksSubject.value;
    const waveformData = generateWaveformData(audioBuffer);

    const updatedTracks = tracks.map(track => {
      if (track.id === this.recordingPreviewTrackId) {
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === this.recordingPreviewClipId
              ? {
                  ...clip,
                  name: clipName,
                  duration: audioBuffer.duration,
                  audioBuffer,
                  waveformData,
                  color: track.color // Use track color
                }
              : clip
          )
        };
      }
      return track;
    });

    this.tracksSubject.next(updatedTracks);
    this.recordingPreviewClipId = null;
    this.recordingPreviewTrackId = null;
  }

  /**
   * Cancels recording preview and removes the preview clip
   */
  cancelRecordingPreview(): void {
    if (!this.recordingPreviewClipId || !this.recordingPreviewTrackId) return;

    const tracks = this.tracksSubject.value;
    const updatedTracks = tracks.map(track => {
      if (track.id === this.recordingPreviewTrackId) {
        return {
          ...track,
          clips: track.clips.filter(clip => clip.id !== this.recordingPreviewClipId)
        };
      }
      return track;
    });

    this.tracksSubject.next(updatedTracks);
    this.recordingPreviewClipId = null;
    this.recordingPreviewTrackId = null;
  }
}
