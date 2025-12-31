import { Component, input, effect, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vu-meter',
  imports: [CommonModule],
  templateUrl: './vu-meter.html',
  styleUrl: './vu-meter.scss',
  standalone: true
})
export class VuMeter implements OnDestroy {
  analyser = input<AnalyserNode | null>(null);

  level = signal(0);
  peakLevel = signal(0);
  private animationFrameId: number | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private peakHoldTime = 0;
  private lastPeakUpdate = 0;

  constructor() {
    effect(() => {
      const analyserNode = this.analyser();
      if (analyserNode) {
        this.startMonitoring(analyserNode);
      } else {
        this.stopMonitoring();
      }
    });
  }

  private startMonitoring(analyserNode: AnalyserNode): void {
    const bufferLength = analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.updateLevel(analyserNode);
  }

  private updateLevel(analyserNode: AnalyserNode): void {
    if (!this.dataArray) return;

    this.animationFrameId = requestAnimationFrame(() => this.updateLevel(analyserNode));

    analyserNode.getByteTimeDomainData(this.dataArray);

    // Calculate RMS (Root Mean Square) for more accurate level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    const db = 20 * Math.log10(rms);

    // Convert to 0-100 scale (typical VU meter range is -60dB to 0dB)
    const levelPercent = Math.max(0, Math.min(100, (db + 60) * (100 / 60)));

    this.level.set(levelPercent);

    // Peak hold logic
    const now = Date.now();
    if (levelPercent > this.peakLevel()) {
      this.peakLevel.set(levelPercent);
      this.lastPeakUpdate = now;
      this.peakHoldTime = 0;
    } else {
      this.peakHoldTime = now - this.lastPeakUpdate;
      if (this.peakHoldTime > 1500) { // Hold peak for 1.5 seconds
        this.peakLevel.set(Math.max(0, this.peakLevel() - 1)); // Slow decay
      }
    }
  }

  private stopMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.level.set(0);
    this.peakLevel.set(0);
    this.dataArray = null;
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  // Get color based on level
  getLevelColor(percent: number): string {
    if (percent >= 90) return '#e74c3c'; // Red (clipping danger)
    if (percent >= 75) return '#f39c12'; // Orange (warning)
    if (percent >= 50) return '#f1c40f'; // Yellow
    return '#2ecc71'; // Green (safe)
  }
}
