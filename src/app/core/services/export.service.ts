import { Injectable, inject } from '@angular/core';
import { ClipManagerService } from '../../features/timeline/services/clip-manager.service';
import { EffectsProcessorService } from './effects-processor.service';
import { AudioContextService } from './audio-context.service';
import { EffectType } from '../models/effect.model';
import { saveAs } from 'file-saver';

export type ExportFormat = 'wav' | 'mp3' | 'webm';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private clipManagerService = inject(ClipManagerService);
  private effectsProcessorService = inject(EffectsProcessorService);
  private audioContextService = inject(AudioContextService);

  /**
   * Exports the final mix in the specified format
   */
  async exportMix(filename: string = 'mix.wav', format: ExportFormat = 'wav', onProgress?: (progress: number) => void): Promise<void> {
    const tracks = this.clipManagerService.getTracks();

    if (tracks.length === 0 || tracks.every(t => t.clips.length === 0)) {
      throw new Error('No audio to export');
    }

    // Calculate the total duration of the project
    const totalDuration = this.calculateTotalDuration();

    if (totalDuration === 0) {
      throw new Error('No audio to export');
    }

    // Add a small buffer at the end for effects (reverb, delay tails)
    const durationWithBuffer = totalDuration + 2;

    // Report initial progress
    if (onProgress) onProgress(10);

    // Create offline context for rendering
    const sampleRate = this.audioContextService.getContext().sampleRate;
    const offlineContext = new OfflineAudioContext(2, durationWithBuffer * sampleRate, sampleRate);

    // Report progress
    if (onProgress) onProgress(20);

    // Render each track
    for (const track of tracks) {
      if (track.muted) continue;

      // Check if any track is soloed
      const hasSoloedTracks = tracks.some(t => t.solo);
      if (hasSoloedTracks && !track.solo) continue;

      // Create gain node for this track
      const trackGainNode = offlineContext.createGain();
      trackGainNode.gain.value = track.volume;

      // Create effects chain for this track
      let effectsChain: AudioNode = trackGainNode;

      // Apply delay effect if enabled (before distortion)
      const delayEffect = track.effects.find(e => e.type === EffectType.Delay);
      if (delayEffect && delayEffect.enabled) {
        const time = (delayEffect.parameters['time'] || 30) / 100;
        const feedback = delayEffect.parameters['feedback'] || 30;
        const wetDry = delayEffect.parameters['wetDry'] || 50;

        // Create delay nodes in offline context
        const inputGain = offlineContext.createGain();
        const delayNode = offlineContext.createDelay(5.0);
        const feedbackNode = offlineContext.createGain();
        const wetGain = offlineContext.createGain();
        const dryGain = offlineContext.createGain();
        const outputGain = offlineContext.createGain();

        delayNode.delayTime.value = Math.max(0, Math.min(1, time));
        feedbackNode.gain.value = Math.max(0, Math.min(100, feedback)) / 100;

        const wetAmount = Math.max(0, Math.min(100, wetDry)) / 100;
        wetGain.gain.value = wetAmount;
        dryGain.gain.value = 1 - wetAmount;

        inputGain.connect(dryGain);
        inputGain.connect(delayNode);
        delayNode.connect(feedbackNode);
        delayNode.connect(wetGain);
        feedbackNode.connect(delayNode);
        wetGain.connect(outputGain);
        dryGain.connect(outputGain);

        outputGain.connect(effectsChain);
        effectsChain = inputGain;
      }

      // Apply distortion effect if enabled
      const distortionEffect = track.effects.find(e => e.type === EffectType.Distortion);
      if (distortionEffect && distortionEffect.enabled) {
        const distortionAmount = distortionEffect.parameters['amount'] || 50;

        // Create distortion node in offline context
        const distortionNode = offlineContext.createWaveShaper();
        const amount = Math.max(0, Math.min(100, distortionAmount));
        const k = amount * 2;
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }

        distortionNode.curve = curve;
        distortionNode.oversample = '4x';

        distortionNode.connect(effectsChain);
        effectsChain = distortionNode;
      }

      // Connect effects chain to destination
      trackGainNode.connect(offlineContext.destination);

      // Schedule all clips for this track
      for (const clip of track.clips) {
        const source = offlineContext.createBufferSource();
        source.buffer = clip.audioBuffer;
        source.connect(effectsChain);
        source.start(clip.startTime);
      }
    }

    // Report progress
    if (onProgress) onProgress(40);

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();

    // Report progress
    if (onProgress) onProgress(60);

    // Convert to requested format
    let blob: Blob;
    switch (format) {
      case 'wav':
        blob = this.convertBufferToWAV(renderedBuffer);
        if (onProgress) onProgress(80);
        break;
      case 'mp3':
        blob = await this.convertBufferToMP3(renderedBuffer, onProgress);
        break;
      case 'webm':
        blob = await this.convertBufferToWebM(renderedBuffer, onProgress);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Report progress
    if (onProgress) onProgress(90);

    // Download the file
    saveAs(blob, filename);

    // Report completion
    if (onProgress) onProgress(100);
  }

  /**
   * Converts an AudioBuffer to WebM blob using MediaRecorder
   */
  private async convertBufferToWebM(buffer: AudioBuffer, onProgress?: (progress: number) => void): Promise<Blob> {
    // Create a new AudioContext for playback
    const audioContext = new AudioContext();

    // Create a MediaStreamDestination
    const destination = audioContext.createMediaStreamDestination();

    // Create a source from the buffer
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);

    // Set up MediaRecorder
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 128000
    });

    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        audioContext.close();
        resolve(blob);
      };

      mediaRecorder.onerror = (error) => {
        audioContext.close();
        reject(error);
      };

      // Start recording
      mediaRecorder.start();

      // Start playback (silent, just for recording)
      source.start(0);

      // Stop recording when the buffer finishes playing
      const duration = buffer.duration;
      setTimeout(() => {
        mediaRecorder.stop();
        if (onProgress) onProgress(80);
      }, duration * 1000 + 100); // Add small buffer
    });
  }

  /**
   * Converts an AudioBuffer to WAV blob
   */
  private convertBufferToWAV(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = this.interleave(buffer);
    const dataLength = data.length * bytesPerSample;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    this.floatTo16BitPCM(view, 44, data);

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Converts an AudioBuffer to MP3 blob using MediaRecorder
   */
  private async convertBufferToMP3(buffer: AudioBuffer, onProgress?: (progress: number) => void): Promise<Blob> {
    // Try to use MediaRecorder with MP3 if supported
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);

    // Check for MP3 support, fallback to other formats
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
      mimeType = 'audio/mpeg';
    }

    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType,
      audioBitsPerSecond: 192000
    });

    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        audioContext.close();
        resolve(blob);
      };

      mediaRecorder.onerror = (error) => {
        audioContext.close();
        reject(error);
      };

      mediaRecorder.start();
      source.start(0);

      const duration = buffer.duration;
      setTimeout(() => {
        mediaRecorder.stop();
        if (onProgress) onProgress(80);
      }, duration * 1000 + 100);
    });
  }

  /**
   * Helper: Interleave channels from AudioBuffer
   */
  private interleave(buffer: AudioBuffer): Float32Array {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const result = new Float32Array(length * numberOfChannels);

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        result[i * numberOfChannels + channel] = channelData[i];
      }
    }

    return result;
  }

  /**
   * Helper: Write string to DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Helper: Convert float samples to 16-bit PCM
   */
  private floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
  }

  /**
   * Calculates the total duration of the project
   */
  private calculateTotalDuration(): number {
    const tracks = this.clipManagerService.getTracks();
    let maxEndTime = 0;

    for (const track of tracks) {
      for (const clip of track.clips) {
        const endTime = clip.startTime + clip.duration;
        if (endTime > maxEndTime) {
          maxEndTime = endTime;
        }
      }
    }

    return maxEndTime;
  }

  /**
   * Gets the estimated duration of the project
   */
  getProjectDuration(): number {
    return this.calculateTotalDuration();
  }
}
