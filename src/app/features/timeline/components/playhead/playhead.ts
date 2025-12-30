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
   */
  playheadLeft = computed(() => this.currentTime() * this.pixelsPerSecond());
}
