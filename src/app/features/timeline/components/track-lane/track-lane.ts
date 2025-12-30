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

  onArmClick(): void {
    this.armToggle.emit(this.track().id);
  }

  onDeleteClick(): void {
    this.trackDelete.emit(this.track().id);
  }
}
