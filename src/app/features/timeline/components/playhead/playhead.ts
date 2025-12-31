import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-playhead',
  imports: [],
  templateUrl: './playhead.html',
  styleUrl: './playhead.scss',
  standalone: true
})
export class Playhead {
  currentTime = input.required<number>(); // Current playback time in seconds
  pixelsPerSecond = input<number>(100);

  /**
   * Calculate the left position of the playhead in pixels
   * Offset by 220px to account for container padding (20px) + track header width (200px)
   */
  playheadLeft = computed(() => 250 + (this.currentTime() * this.pixelsPerSecond()));
}
