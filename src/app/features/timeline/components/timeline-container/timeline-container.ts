import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClipManagerService } from '../../services/clip-manager.service';
import { TrackLane } from '../track-lane/track-lane';

@Component({
  selector: 'app-timeline-container',
  imports: [CommonModule, TrackLane],
  templateUrl: './timeline-container.html',
  styleUrl: './timeline-container.scss',
  standalone: true
})
export class TimelineContainer {
  private clipManagerService = inject(ClipManagerService);

  tracks = toSignal(this.clipManagerService.tracks$, { initialValue: [] });
  pixelsPerSecond = signal(100); // Can be adjusted for zoom
  timelineLength = signal(30); // 30 seconds visible

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
}
