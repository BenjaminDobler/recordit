import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioClip } from '../../../core/models/audio-clip.model';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-clip-context-menu',
  imports: [CommonModule],
  templateUrl: './clip-context-menu.html',
  styleUrl: './clip-context-menu.scss',
  standalone: true
})
export class ClipContextMenu {
  clip = input.required<AudioClip>();
  position = input.required<ContextMenuPosition>();
  visible = input.required<boolean>();
  currentPlayheadTime = input<number>(0);

  split = output<{ clipId: string; splitTime: number }>();
  duplicate = output<string>();
  delete = output<string>();
  close = output<void>();

  constructor() {
    effect(() => {
      if (this.visible()) {
        setTimeout(() => document.addEventListener('click', this.onClickOutside), 0);
      } else {
        document.removeEventListener('click', this.onClickOutside);
      }
    });
  }

  onSplit(): void {
    const clip = this.clip();
    const playheadTime = this.currentPlayheadTime();

    if (playheadTime >= clip.startTime && playheadTime <= clip.startTime + clip.duration) {
      const splitTime = playheadTime - clip.startTime;
      this.split.emit({ clipId: clip.id, splitTime });
    }
    this.close.emit();
  }

  onDuplicate(): void {
    this.duplicate.emit(this.clip().id);
    this.close.emit();
  }

  onDelete(): void {
    this.delete.emit(this.clip().id);
    this.close.emit();
  }

  private onClickOutside = (event: MouseEvent): void => {
    if (!(event.target as HTMLElement).closest('.clip-context-menu')) {
      this.close.emit();
    }
  };

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onClickOutside);
  }
}
