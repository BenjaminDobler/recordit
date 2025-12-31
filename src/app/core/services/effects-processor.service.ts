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

    // Normalize amount to 0-1 range, then scale to useful range (1-50)
    const normalizedAmount = Math.max(0, Math.min(100, amount)) / 100;
    // At 0%: drive = 1 (minimal distortion)
    // At 50%: drive = 25 (moderate distortion)
    // At 100%: drive = 50 (heavy distortion)
    const drive = 1 + normalizedAmount * 49;

    // Create distortion curve
    const samples = 44100;
    const curve = new Float32Array(samples);

    // Generate waveshaping curve based on amount
    // Using a combination of soft clipping (tanh) and hard clipping
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;

      // Apply drive (pre-gain)
      const driven = x * drive;

      // Soft clip using tanh for smooth distortion
      // tanh naturally clamps between -1 and 1
      curve[i] = Math.tanh(driven);
    }

    distortion.curve = curve;
    distortion.oversample = '4x'; // Better quality

    return distortion;
  }

  /**
   * Creates a delay effect with feedback
   * @param time Delay time in seconds (0-1)
   * @param feedback Feedback amount (0-100)
   * @param wetDry Wet/dry mix (0-100)
   * @returns Object containing delay nodes and connections
   */
  createDelay(time: number, feedback: number, wetDry: number): {
    input: GainNode;
    output: GainNode;
    delayNode: DelayNode;
    feedbackNode: GainNode;
  } {
    const audioContext = this.audioContextService.getContext();

    // Create nodes
    const inputGain = audioContext.createGain();
    const delayNode = audioContext.createDelay(5.0); // Max 5 seconds
    const feedbackNode = audioContext.createGain();
    const wetGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const outputGain = audioContext.createGain();

    // Set parameters
    delayNode.delayTime.value = Math.max(0, Math.min(1, time));
    feedbackNode.gain.value = Math.max(0, Math.min(100, feedback)) / 100;

    const wetAmount = Math.max(0, Math.min(100, wetDry)) / 100;
    wetGain.gain.value = wetAmount;
    dryGain.gain.value = 1 - wetAmount;

    // Connect the delay chain
    // Input splits to dry and wet paths
    inputGain.connect(dryGain);
    inputGain.connect(delayNode);

    // Delay path with feedback
    delayNode.connect(feedbackNode);
    delayNode.connect(wetGain);
    feedbackNode.connect(delayNode); // Feedback loop

    // Mix wet and dry to output
    wetGain.connect(outputGain);
    dryGain.connect(outputGain);

    return {
      input: inputGain,
      output: outputGain,
      delayNode,
      feedbackNode
    };
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
