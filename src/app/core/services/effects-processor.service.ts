import { Injectable } from '@angular/core';
import { AudioContextService } from './audio-context.service';

@Injectable({
  providedIn: 'root'
})
export class EffectsProcessorService {
  constructor(private audioContextService: AudioContextService) {}

  /**
   * Creates a distortion effect using WaveShaperNode
   * @param amount Distortion amount (0-100)
   * @returns WaveShaperNode configured for distortion
   */
  createDistortion(amount: number): WaveShaperNode {
    const audioContext = this.audioContextService.getContext();
    const distortion = audioContext.createWaveShaper();

    // Normalize amount to 0-1 range
    const normalizedAmount = Math.max(0, Math.min(100, amount)) / 100;

    // Create distortion curve
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    // Generate waveshaping curve based on amount
    // Higher amount = more aggressive distortion
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Use tanh for smooth distortion, scaled by amount
      curve[i] = ((3 + normalizedAmount * 20) * x * 20 * deg) / (Math.PI + normalizedAmount * Math.abs(x));
    }

    distortion.curve = curve;
    distortion.oversample = '4x'; // Better quality

    return distortion;
  }

  /**
   * Creates a bypass (no effect) node
   */
  createBypass(): GainNode {
    const audioContext = this.audioContextService.getContext();
    const bypass = audioContext.createGain();
    bypass.gain.value = 1;
    return bypass;
  }
}
