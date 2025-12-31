import { Component, input, effect, viewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-waveform-display',
  imports: [],
  templateUrl: './waveform-display.html',
  styleUrl: './waveform-display.scss',
  standalone: true
})
export class WaveformDisplay implements AfterViewInit {
  waveformData = input<number[]>([]);
  width = input<number>(200);
  height = input<number>(60);
  trimStart = input<number>(0);  // Start time in seconds to trim from
  trimEnd = input<number>(0);    // End time in seconds to trim from
  duration = input<number>(0);   // Total duration in seconds

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('waveformCanvas');

  constructor() {
    // Re-render waveform when data or dimensions change
    effect(() => {
      const data = this.waveformData();
      const w = this.width();
      const h = this.height();
      const trimS = this.trimStart();
      const trimE = this.trimEnd();
      const dur = this.duration();
      const canvasEl = this.canvas();

      if (data.length > 0 && canvasEl) {
        this.drawWaveform();
      }
    });
  }

  ngAfterViewInit(): void {
    // Initial draw after view is ready
    if (this.waveformData().length > 0) {
      this.drawWaveform();
    }
  }

  /**
   * Draws the waveform on the canvas
   */
  private drawWaveform(): void {
    const canvasElement = this.canvas().nativeElement;
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    const data = this.waveformData();
    const width = this.width();
    const height = this.height();
    const trimStart = this.trimStart();
    const trimEnd = this.trimEnd();
    const duration = this.duration();

    // Set canvas dimensions
    canvasElement.width = width;
    canvasElement.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform (dark color for golden clips - Logic Pro style)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;

    const centerY = height / 2;

    // Calculate visible portion of waveform based on trim
    let visibleData = data;
    if (duration > 0 && (trimStart > 0 || trimEnd > 0)) {
      // Calculate start and end indices based on trim times
      const startIndex = Math.floor((trimStart / duration) * data.length);
      const endIndex = Math.ceil(((duration - trimEnd) / duration) * data.length);
      visibleData = data.slice(startIndex, endIndex);
    }

    // Safety check - ensure we have data to draw
    if (visibleData.length === 0) {
      visibleData = data; // Fallback to full data
    }

    const barWidth = width / visibleData.length;

    visibleData.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = peak * centerY;

      // Draw bar from center
      ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight * 2);
    });
  }
}
