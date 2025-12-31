import { Component, input, computed, signal, output } from '@angular/core';
import { AudioClip } from '../../../../core/models/audio-clip.model';
import { WaveformDisplay } from '../../../../shared/components/waveform-display/waveform-display';
import { ClipContextMenu, ContextMenuPosition } from '../../../../shared/components/clip-context-menu/clip-context-menu';

@Component({
  selector: 'app-clip-item',
  imports: [WaveformDisplay, ClipContextMenu],
  templateUrl: './clip-item.html',
  styleUrl: './clip-item.scss',
  standalone: true
})
export class ClipItem {
  clip = input.required<AudioClip>();
  pixelsPerSecond = input<number>(100); // Default: 100 pixels per second
  currentPlayheadTime = input<number>(0);

  // Edge detection constant
  private readonly EDGE_ZONE_WIDTH = 10; // pixels

  // Drag state
  isDragging = signal(false);
  dragStartX = 0;
  dragStartLeft = 0;
  currentDragLeft = signal(0);

  // Trim state
  isTrimming = signal(false);
  trimMode = signal<'left' | 'right' | null>(null);
  currentTrimStart = signal(0);
  currentTrimEnd = signal(0);
  isHoverLeft = signal(false);
  isHoverRight = signal(false);

  // Context menu state
  showContextMenu = signal(false);
  contextMenuPosition = signal<ContextMenuPosition>({ x: 0, y: 0 });

  // Events
  positionChange = output<{ clipId: string; newStartTime: number }>();
  trimChange = output<{ clipId: string; trimStart: number; trimEnd: number }>();
  clipSplit = output<{ clipId: string; splitTime: number }>();
  clipDuplicate = output<string>();
  clipDelete = output<string>();

  /**
   * Calculate the width of the clip in pixels (accounting for trim)
   */
  clipWidth = computed(() => {
    const clip = this.clip();
    const visibleDuration = clip.duration - clip.trimStart - clip.trimEnd;
    return visibleDuration * this.pixelsPerSecond();
  });

  /**
   * Calculate the left position of the clip in pixels (accounting for trim)
   */
  clipLeft = computed(() => {
    if (this.isDragging()) {
      return this.currentDragLeft();
    }

    const clip = this.clip();
    let leftPos = clip.startTime * this.pixelsPerSecond();

    // If trimming left edge, adjust position
    if (this.isTrimming() && this.trimMode() === 'left') {
      const trimDelta = this.currentTrimStart() - clip.trimStart;
      leftPos += trimDelta * this.pixelsPerSecond();
    }

    return leftPos;
  });

  /**
   * Calculate cursor style based on state
   */
  cursorStyle = computed(() => {
    if (this.isTrimming()) return 'col-resize';
    if (this.isDragging()) return 'grabbing';
    if (this.isHoverLeft() || this.isHoverRight()) return 'col-resize';
    return 'grab';
  });

  /**
   * Detect edge hover for trim handles
   */
  onMouseMoveHover(event: MouseEvent): void {
    if (this.isDragging() || this.isTrimming()) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeX = event.clientX - rect.left;

    this.isHoverLeft.set(relativeX <= this.EDGE_ZONE_WIDTH);
    this.isHoverRight.set(relativeX >= rect.width - this.EDGE_ZONE_WIDTH);
  }

  /**
   * Clear edge hover state
   */
  onMouseLeave(): void {
    this.isHoverLeft.set(false);
    this.isHoverRight.set(false);
  }

  /**
   * Start dragging or trimming based on click position
   */
  onMouseDown(event: MouseEvent): void {
    event.preventDefault();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeX = event.clientX - rect.left;

    // Determine if clicking on edge (trim) or center (move)
    if (relativeX <= this.EDGE_ZONE_WIDTH) {
      this.startTrimDrag('left', event);
    } else if (relativeX >= rect.width - this.EDGE_ZONE_WIDTH) {
      this.startTrimDrag('right', event);
    } else {
      this.startMoveDrag(event);
    }
  }

  /**
   * Start move drag
   */
  private startMoveDrag(event: MouseEvent): void {
    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartLeft = this.clip().startTime * this.pixelsPerSecond();
    this.currentDragLeft.set(this.dragStartLeft);

    // Add global listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Start trim drag
   */
  private startTrimDrag(mode: 'left' | 'right', event: MouseEvent): void {
    this.isTrimming.set(true);
    this.trimMode.set(mode);
    this.dragStartX = event.clientX;
    this.currentTrimStart.set(this.clip().trimStart);
    this.currentTrimEnd.set(this.clip().trimEnd);

    document.addEventListener('mousemove', this.onTrimMove);
    document.addEventListener('mouseup', this.onTrimUp);
  }

  /**
   * Handle mouse move during trim
   */
  private onTrimMove = (event: MouseEvent): void => {
    if (!this.isTrimming()) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaTime = deltaX / this.pixelsPerSecond();

    let newTrimStart = this.clip().trimStart;
    let newTrimEnd = this.clip().trimEnd;

    if (this.trimMode() === 'left') {
      // Trim from start
      newTrimStart = Math.max(0, this.currentTrimStart() + deltaTime);
      const maxTrim = this.clip().duration - newTrimEnd - 0.1; // min 0.1s visible
      newTrimStart = Math.min(newTrimStart, maxTrim);
      this.currentTrimStart.set(newTrimStart);
    } else {
      // Trim from end
      newTrimEnd = Math.max(0, this.currentTrimEnd() - deltaTime);
      const maxTrim = this.clip().duration - newTrimStart - 0.1; // min 0.1s visible
      newTrimEnd = Math.min(newTrimEnd, maxTrim);
      this.currentTrimEnd.set(newTrimEnd);
    }

    // Emit changes continuously for live updates
    this.trimChange.emit({
      clipId: this.clip().id,
      trimStart: newTrimStart,
      trimEnd: newTrimEnd
    });
  };

  /**
   * Finish trim drag
   */
  private onTrimUp = (): void => {
    if (!this.isTrimming()) return;

    // Reset state (trim changes already emitted during drag)
    this.isTrimming.set(false);
    this.trimMode.set(null);

    // Remove listeners
    document.removeEventListener('mousemove', this.onTrimMove);
    document.removeEventListener('mouseup', this.onTrimUp);
  };

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

  /**
   * Show context menu
   */
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
    this.showContextMenu.set(true);
  }

  /**
   * Close context menu
   */
  onContextMenuClose(): void {
    this.showContextMenu.set(false);
  }

  /**
   * Handle split action from context menu
   */
  onClipSplit(event: { clipId: string; splitTime: number }): void {
    this.clipSplit.emit(event);
  }

  /**
   * Handle duplicate action from context menu
   */
  onClipDuplicate(clipId: string): void {
    this.clipDuplicate.emit(clipId);
  }

  /**
   * Handle delete action from context menu
   */
  onClipDelete(clipId: string): void {
    this.clipDelete.emit(clipId);
  }
}
