import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioTrack } from '../../../../core/models/audio-track.model';
import { ClipItem } from '../clip-item/clip-item';

@Component({
  selector: 'app-track-lane',
  imports: [CommonModule, ClipItem],
  templateUrl: './track-lane.html',
  styleUrl: './track-lane.scss',
  standalone: true
})
export class TrackLane {
  track = input.required<AudioTrack>();
  pixelsPerSecond = input<number>(100);

  // Events
  armToggle = output<string>();
  trackDelete = output<string>();
  volumeChange = output<{ trackId: string; volume: number }>();
  muteToggle = output<string>();
  soloToggle = output<string>();
  clipPositionChange = output<{ clipId: string; newStartTime: number }>();

  onArmClick(): void {
    this.armToggle.emit(this.track().id);
  }

  onDeleteClick(): void {
    this.trackDelete.emit(this.track().id);
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseInt(target.value) / 100;
    this.volumeChange.emit({ trackId: this.track().id, volume });
  }

  onMuteClick(): void {
    this.muteToggle.emit(this.track().id);
  }

  onSoloClick(): void {
    this.soloToggle.emit(this.track().id);
  }

  onClipPositionChange(event: { clipId: string; newStartTime: number }): void {
    this.clipPositionChange.emit(event);
  }
}
