import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClipManagerService } from '../../services/clip-manager.service';
import { PlaybackService } from '../../../../core/services/playback.service';
import { EffectType } from '../../../../core/models/effect.model';
import { TrackLane } from '../track-lane/track-lane';
import { Playhead } from '../playhead/playhead';

@Component({
  selector: 'app-timeline-container',
  imports: [CommonModule, TrackLane, Playhead],
  templateUrl: './timeline-container.html',
  styleUrl: './timeline-container.scss',
  standalone: true
})
export class TimelineContainer {
  private clipManagerService = inject(ClipManagerService);
  private playbackService = inject(PlaybackService);

  tracks = toSignal(this.clipManagerService.tracks$, { initialValue: [] });
  currentTime = toSignal(this.playbackService.currentTime$, { initialValue: 0 });
  pixelsPerSecond = signal(100); // Can be adjusted for zoom
  timelineLength = signal(30); // 30 seconds visible

  // Offset for track header (same as playhead)
  private readonly TIMELINE_OFFSET = 250;

  /**
   * Generate time markers for the ruler
   */
  timeMarkers = computed(() => {
    const markers: number[] = [];
    for (let i = 0; i <= this.timelineLength(); i++) {
      markers.push(i);
    }
    return markers;
  });

  /**
   * Adds a new track
   */
  onAddTrack(): void {
    this.clipManagerService.addTrack();
  }

  /**
   * Toggles the armed state of a track
   */
  onTrackArmToggle(trackId: string): void {
    this.clipManagerService.toggleTrackArmed(trackId);
  }

  /**
   * Deletes a track
   */
  onTrackDelete(trackId: string): void {
    if (confirm('Are you sure you want to delete this track and all its clips?')) {
      this.clipManagerService.removeTrack(trackId);
    }
  }

  /**
   * Updates a track's volume
   */
  onTrackVolumeChange(event: { trackId: string; volume: number }): void {
    this.clipManagerService.updateTrackVolume(event.trackId, event.volume);
  }

  /**
   * Updates a track's pan
   */
  onTrackPanChange(event: { trackId: string; pan: number }): void {
    this.clipManagerService.updateTrackPan(event.trackId, event.pan);
  }

  /**
   * Toggles a track's mute state
   */
  onTrackMuteToggle(trackId: string): void {
    this.clipManagerService.toggleTrackMute(trackId);
  }

  /**
   * Toggles a track's solo state
   */
  onTrackSoloToggle(trackId: string): void {
    this.clipManagerService.toggleTrackSolo(trackId);
  }

  /**
   * Updates a clip's position
   */
  onClipPositionChange(event: { clipId: string; newStartTime: number }): void {
    this.clipManagerService.updateClipPosition(event.clipId, event.newStartTime);
  }

  /**
   * Updates a clip's trim values
   */
  onClipTrimChange(event: { clipId: string; trimStart: number; trimEnd: number }): void {
    this.clipManagerService.updateClipTrim(event.clipId, event.trimStart, event.trimEnd);
  }

  /**
   * Splits a clip at the specified time
   */
  onClipSplit(event: { clipId: string; splitTime: number }): void {
    this.clipManagerService.splitClipAtTime(event.clipId, event.splitTime);
  }

  /**
   * Duplicates a clip
   */
  onClipDuplicate(clipId: string): void {
    this.clipManagerService.duplicateClip(clipId);
  }

  /**
   * Deletes a clip
   */
  onClipDelete(clipId: string): void {
    this.clipManagerService.removeClip(clipId);
  }

  /**
   * Updates distortion amount for a track
   */
  onDistortionChange(event: { trackId: string; amount: number }): void {
    this.clipManagerService.updateTrackEffect(
      event.trackId,
      EffectType.Distortion,
      { amount: event.amount },
      true
    );
  }

  /**
   * Toggles distortion effect on/off for a track
   */
  onDistortionToggle(trackId: string): void {
    this.clipManagerService.toggleTrackEffect(trackId, EffectType.Distortion);
  }

  /**
   * Updates delay parameters for a track
   */
  onDelayChange(event: { trackId: string; time: number; feedback: number; wetDry: number }): void {
    this.clipManagerService.updateTrackEffect(
      event.trackId,
      EffectType.Delay,
      { time: event.time, feedback: event.feedback, wetDry: event.wetDry },
      true
    );
  }

  /**
   * Toggles delay effect on/off for a track
   */
  onDelayToggle(trackId: string): void {
    this.clipManagerService.toggleTrackEffect(trackId, EffectType.Delay);
  }

  /**
   * Handles playhead time change from drag
   */
  onPlayheadTimeChange(newTime: number): void {
    this.playbackService.seek(newTime);
  }

  /**
   * Handles click on the time ruler to seek to that position
   */
  onRulerClick(event: MouseEvent): void {
    // Get the click position relative to the viewport
    const clickX = event.clientX;

    // Get the ruler wrapper's position
    const rulerWrapper = event.currentTarget as HTMLElement;
    const rect = rulerWrapper.getBoundingClientRect();

    // Calculate relative position within the ruler wrapper
    const relativeX = clickX - rect.left;

    // Account for the ruler spacer offset
    const timelineX = relativeX - this.TIMELINE_OFFSET;

    // Convert pixels to time
    const newTime = Math.max(0, timelineX / this.pixelsPerSecond());

    // Seek to the new position
    this.playbackService.seek(newTime);
  }

  /**
   * Handles generic effect toggle from effects panel
   */
  onEffectToggle(event: { trackId: string; effectType: EffectType }): void {
    this.clipManagerService.toggleTrackEffect(event.trackId, event.effectType);
  }

  /**
   * Handles generic effect parameter changes from effects panel
   */
  onEffectChange(event: { trackId: string; effectType: EffectType; parameters: Record<string, number> }): void {
    this.clipManagerService.updateTrackEffect(event.trackId, event.effectType, event.parameters, true);
  }
}
