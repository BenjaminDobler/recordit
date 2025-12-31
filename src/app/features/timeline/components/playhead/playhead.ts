import { Component, input, computed, signal, output } from '@angular/core';

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

  // Drag state
  isDragging = signal(false);
  dragStartX = 0;
  dragStartTime = 0;
  currentDragTime = signal(0);

  // Output event for time changes
  timeChange = output<number>();

  // Offset for track header (220px padding + 30px extra)
  private readonly TIMELINE_OFFSET = 250;

  /**
   * Calculate the left position of the playhead in pixels
   * Offset by 250px to account for container padding (20px) + track header width (200px) + extra (30px)
   */
  playheadLeft = computed(() => {
    const time = this.isDragging() ? this.currentDragTime() : this.currentTime();
    return this.TIMELINE_OFFSET + (time * this.pixelsPerSecond());
  });

  /**
   * Cursor style based on drag state
   */
  cursorStyle = computed(() => this.isDragging() ? 'grabbing' : 'grab');

  /**
   * Start dragging the playhead
   */
  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartTime = this.currentTime();
    this.currentDragTime.set(this.dragStartTime);

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Handle mouse move during drag
   */
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging()) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaTime = deltaX / this.pixelsPerSecond();
    const newTime = Math.max(0, this.dragStartTime + deltaTime);

    this.currentDragTime.set(newTime);
  };

  /**
   * Finish dragging
   */
  private onMouseUp = (): void => {
    if (!this.isDragging()) return;

    const finalTime = this.currentDragTime();
    this.timeChange.emit(finalTime);

    this.isDragging.set(false);

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };
}
