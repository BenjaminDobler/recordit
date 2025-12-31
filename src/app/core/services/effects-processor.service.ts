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
   * Creates a boost effect using GainNode
   * @param gain Boost amount (0-100)
   * @returns GainNode configured for boost
   */
  createBoost(gain: number): GainNode {
    const audioContext = this.audioContextService.getContext();
    const boostNode = audioContext.createGain();

    // Convert 0-100 to decibels (0-20 dB boost)
    const normalizedGain = Math.max(0, Math.min(100, gain)) / 100;
    const dbGain = normalizedGain * 20; // 0 to 20 dB
    const linearGain = Math.pow(10, dbGain / 20); // Convert dB to linear

    boostNode.gain.value = linearGain;

    return boostNode;
  }

  /**
   * Creates a flanger effect using delay and LFO
   * @param rate LFO rate (0-100)
   * @param depth Delay depth (0-100)
   * @param feedback Feedback amount (0-100)
   * @returns Object containing flanger nodes
   */
  createFlanger(rate: number, depth: number, feedback: number): {
    input: GainNode;
    output: GainNode;
  } {
    const audioContext = this.audioContextService.getContext();

    // Create nodes
    const inputGain = audioContext.createGain();
    const delayNode = audioContext.createDelay(0.02); // Max 20ms delay
    const feedbackNode = audioContext.createGain();
    const wetGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const outputGain = audioContext.createGain();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();

    // Set parameters
    const normalizedRate = Math.max(0, Math.min(100, rate)) / 100;
    const normalizedDepth = Math.max(0, Math.min(100, depth)) / 100;
    const normalizedFeedback = Math.max(0, Math.min(100, feedback)) / 100;

    // LFO rate: 0.1 to 5 Hz
    lfo.frequency.value = 0.1 + normalizedRate * 4.9;
    lfo.type = 'sine';

    // LFO depth: controls delay modulation (0-10ms)
    lfoGain.gain.value = normalizedDepth * 0.005;

    // Feedback
    feedbackNode.gain.value = normalizedFeedback * 0.7;

    // Wet/dry mix (50/50 for flanger)
    wetGain.gain.value = 0.7;
    dryGain.gain.value = 0.7;

    // Base delay time
    delayNode.delayTime.value = 0.005; // 5ms base

    // Connect LFO to modulate delay time
    lfo.connect(lfoGain);
    lfoGain.connect(delayNode.delayTime);

    // Connect the flanger chain
    inputGain.connect(dryGain);
    inputGain.connect(delayNode);
    delayNode.connect(feedbackNode);
    delayNode.connect(wetGain);
    feedbackNode.connect(delayNode); // Feedback loop

    // Mix to output
    wetGain.connect(outputGain);
    dryGain.connect(outputGain);

    // Start LFO
    lfo.start();

    return {
      input: inputGain,
      output: outputGain
    };
  }

  /**
   * Creates a simple reverb effect using multiple delays
   * @param roomSize Room size (0-100)
   * @param damping High frequency damping (0-100)
   * @param wetDry Wet/dry mix (0-100)
   * @returns Object containing reverb nodes
   */
  createReverb(roomSize: number, damping: number, wetDry: number): {
    input: GainNode;
    output: GainNode;
  } {
    const audioContext = this.audioContextService.getContext();

    // Create nodes
    const inputGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    const outputGain = audioContext.createGain();

    // Create multiple delay lines for reverb (Schroeder reverb approximation)
    const delays = [
      audioContext.createDelay(1),
      audioContext.createDelay(1),
      audioContext.createDelay(1),
      audioContext.createDelay(1)
    ];

    const feedbacks = [
      audioContext.createGain(),
      audioContext.createGain(),
      audioContext.createGain(),
      audioContext.createGain()
    ];

    // Lowpass filter for damping
    const dampingFilter = audioContext.createBiquadFilter();
    dampingFilter.type = 'lowpass';

    // Set parameters
    const normalizedRoomSize = Math.max(0, Math.min(100, roomSize)) / 100;
    const normalizedDamping = Math.max(0, Math.min(100, damping)) / 100;
    const normalizedWetDry = Math.max(0, Math.min(100, wetDry)) / 100;

    // Delay times (prime numbers for better diffusion)
    const delayTimes = [0.037, 0.041, 0.043, 0.047];
    delays.forEach((delay, i) => {
      delay.delayTime.value = delayTimes[i] * (0.5 + normalizedRoomSize * 1.5);
    });

    // Feedback amounts
    const feedbackAmount = 0.5 + normalizedRoomSize * 0.3;
    feedbacks.forEach(feedback => {
      feedback.gain.value = feedbackAmount;
    });

    // Damping filter
    dampingFilter.frequency.value = 20000 - (normalizedDamping * 18000); // 2kHz to 20kHz

    // Wet/dry mix
    wetGain.gain.value = normalizedWetDry;
    dryGain.gain.value = 1 - normalizedWetDry;

    // Connect dry path
    inputGain.connect(dryGain);
    dryGain.connect(outputGain);

    // Connect reverb network
    inputGain.connect(dampingFilter);

    delays.forEach((delay, i) => {
      dampingFilter.connect(delay);
      delay.connect(feedbacks[i]);
      feedbacks[i].connect(delay); // Feedback loop
      delay.connect(wetGain);
    });

    wetGain.connect(outputGain);

    return {
      input: inputGain,
      output: outputGain
    };
  }

  /**
   * Creates a tremolo effect using amplitude modulation
   * @param rate LFO rate (0-100)
   * @param depth Modulation depth (0-100)
   * @returns GainNode with tremolo modulation
   */
  createTremolo(rate: number, depth: number): GainNode {
    const audioContext = this.audioContextService.getContext();

    // Create nodes
    const tremoloGain = audioContext.createGain();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();

    // Set parameters
    const normalizedRate = Math.max(0, Math.min(100, rate)) / 100;
    const normalizedDepth = Math.max(0, Math.min(100, depth)) / 100;

    // LFO rate: 1 to 20 Hz
    lfo.frequency.value = 1 + normalizedRate * 19;
    lfo.type = 'sine';

    // LFO depth affects gain modulation
    lfoGain.gain.value = normalizedDepth * 0.5;

    // Base gain at 1 - depth/2 (so modulation centers around 1)
    tremoloGain.gain.value = 1 - (normalizedDepth * 0.25);

    // Connect LFO to modulate gain
    lfo.connect(lfoGain);
    lfoGain.connect(tremoloGain.gain);

    // Start LFO
    lfo.start();

    return tremoloGain;
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
