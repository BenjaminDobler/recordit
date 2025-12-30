import { Component, input, computed, signal, output } from '@angular/core';
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

  // Drag state
  isDragging = signal(false);
  dragStartX = 0;
  dragStartLeft = 0;
  currentDragLeft = signal(0);

  // Events
  positionChange = output<{ clipId: string; newStartTime: number }>();

  /**
   * Calculate the width of the clip in pixels
   */
  clipWidth = computed(() => this.clip().duration * this.pixelsPerSecond());

  /**
   * Calculate the left position of the clip in pixels
   */
  clipLeft = computed(() => {
    if (this.isDragging()) {
      return this.currentDragLeft();
    }
    return this.clip().startTime * this.pixelsPerSecond();
  });

  /**
   * Start dragging
   */
  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartLeft = this.clip().startTime * this.pixelsPerSecond();
    this.currentDragLeft.set(this.dragStartLeft);

    // Add global listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Handle mouse move during drag
   */
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging()) return;

    const deltaX = event.clientX - this.dragStartX;
    const newLeft = Math.max(0, this.dragStartLeft + deltaX);
    this.currentDragLeft.set(newLeft);
  };

  /**
   * Finish dragging
   */
  private onMouseUp = (event: MouseEvent): void => {
    if (!this.isDragging()) return;

    // Calculate final position
    const newLeftPx = this.currentDragLeft();
    const newStartTime = newLeftPx / this.pixelsPerSecond();

    // Emit position change
    this.positionChange.emit({
      clipId: this.clip().id,
      newStartTime: Math.max(0, newStartTime)
    });

    // Reset drag state
    this.isDragging.set(false);

    // Remove global listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };
}
