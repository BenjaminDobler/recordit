import { Component, input, computed } from '@angular/core';
import { AudioClip } from '../../../../core/models/audio-clip.model';

@Component({
  selector: 'app-clip-item',
  imports: [],
  templateUrl: './clip-item.html',
  styleUrl: './clip-item.scss',
  standalone: true
})
export class ClipItem {
  clip = input.required<AudioClip>();
  pixelsPerSecond = input<number>(100); // Default: 100 pixels per second

  /**
   * Calculate the width of the clip in pixels
   */
  clipWidth = computed(() => this.clip().duration * this.pixelsPerSecond());

  /**
   * Calculate the left position of the clip in pixels
   */
  clipLeft = computed(() => this.clip().startTime * this.pixelsPerSecond());
}
