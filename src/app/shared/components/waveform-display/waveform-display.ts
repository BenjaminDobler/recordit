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

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('waveformCanvas');

  constructor() {
    // Re-render waveform when data or dimensions change
    effect(() => {
      const data = this.waveformData();
      const w = this.width();
      const h = this.height();
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

    // Set canvas dimensions
    canvasElement.width = width;
    canvasElement.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform (dark color for golden clips - Logic Pro style)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;

    const barWidth = width / data.length;
    const centerY = height / 2;

    data.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = peak * centerY;

      // Draw bar from center
      ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight * 2);
    });
  }
}
