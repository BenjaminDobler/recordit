import { Injectable, inject } from '@angular/core';
import { IndexedDBService } from './indexeddb.service';
import { ClipManagerService } from '../../features/timeline/services/clip-manager.service';
import { AudioTrack } from '../models/audio-track.model';
import { AudioClip } from '../models/audio-clip.model';
import { v4 as uuidv4 } from 'uuid';

interface SerializedClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  audioBlobId: string;
  waveformData?: number[];
  color?: string;
}

interface SerializedTrack {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  clips: SerializedClip[];
  effects: any[];
  color: string;
}

interface SerializedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tracks: SerializedTrack[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectStorageService {
  private indexedDBService = inject(IndexedDBService);
  private clipManagerService = inject(ClipManagerService);

  /**
   * Saves the current project to IndexedDB
   */
  async saveProject(projectName: string): Promise<string> {
    const tracks = this.clipManagerService.getTracks();
    const projectId = uuidv4();

    // Serialize tracks and save audio blobs
    const serializedTracks: SerializedTrack[] = [];

    for (const track of tracks) {
      const serializedClips: SerializedClip[] = [];

      for (const clip of track.clips) {
        // Convert AudioBuffer to Blob
        const audioBlob = await this.audioBufferToBlob(clip.audioBuffer);
        const audioBlobId = uuidv4();

        // Save audio blob to IndexedDB
        await this.indexedDBService.save('audioBlobs', {
          id: audioBlobId,
          blob: audioBlob
        });

        // Serialize clip without the AudioBuffer
        serializedClips.push({
          id: clip.id,
          trackId: clip.trackId,
          name: clip.name,
          startTime: clip.startTime,
          duration: clip.duration,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
          audioBlobId,
          waveformData: clip.waveformData,
          color: clip.color
        });
      }

      // Serialize track
      serializedTracks.push({
        id: track.id,
        name: track.name,
        volume: track.volume,
        muted: track.muted,
        solo: track.solo,
        armed: track.armed,
        clips: serializedClips,
        effects: track.effects,
        color: track.color
      });
    }

    // Create project object
    const project: SerializedProject = {
      id: projectId,
      name: projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: serializedTracks
    };

    // Save project to IndexedDB
    await this.indexedDBService.save('projects', project);

    return projectId;
  }

  /**
   * Loads a project from IndexedDB
   */
  async loadProject(projectId: string): Promise<void> {
    // Get project from IndexedDB
    const project = await this.indexedDBService.get<SerializedProject>('projects', projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Clear current tracks
    this.clipManagerService.clearAllClips();

    // Deserialize tracks
    const tracks: AudioTrack[] = [];

    for (const serializedTrack of project.tracks) {
      const clips: AudioClip[] = [];

      for (const serializedClip of serializedTrack.clips) {
        // Load audio blob from IndexedDB
        const audioBlobData = await this.indexedDBService.get<{ id: string; blob: Blob }>('audioBlobs', serializedClip.audioBlobId);

        if (!audioBlobData) {
          console.error('Audio blob not found for clip:', serializedClip.id);
          continue;
        }

        // Convert Blob back to AudioBuffer
        const audioBuffer = await this.blobToAudioBuffer(audioBlobData.blob);

        // Reconstruct clip
        clips.push({
          id: serializedClip.id,
          trackId: serializedClip.trackId,
          name: serializedClip.name,
          startTime: serializedClip.startTime,
          duration: serializedClip.duration,
          trimStart: serializedClip.trimStart,
          trimEnd: serializedClip.trimEnd,
          audioBuffer,
          waveformData: serializedClip.waveformData,
          color: serializedClip.color
        });
      }

      // Reconstruct track
      tracks.push({
        id: serializedTrack.id,
        name: serializedTrack.name,
        volume: serializedTrack.volume,
        muted: serializedTrack.muted,
        solo: serializedTrack.solo,
        armed: serializedTrack.armed,
        clips,
        effects: serializedTrack.effects,
        color: serializedTrack.color
      });
    }

    // Update ClipManagerService with loaded tracks
    // Need to add a method to ClipManagerService to set tracks directly
    this.clipManagerService.setTracks(tracks);
  }

  /**
   * Gets all saved projects
   */
  async getAllProjects(): Promise<SerializedProject[]> {
    return this.indexedDBService.getAll<SerializedProject>('projects');
  }

  /**
   * Deletes a project and its associated audio blobs
   */
  async deleteProject(projectId: string): Promise<void> {
    const project = await this.indexedDBService.get<SerializedProject>('projects', projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Delete all audio blobs associated with this project
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        await this.indexedDBService.delete('audioBlobs', clip.audioBlobId);
      }
    }

    // Delete the project
    await this.indexedDBService.delete('projects', projectId);
  }

  /**
   * Converts an AudioBuffer to a Blob
   */
  private async audioBufferToBlob(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Create an offline audio context
    const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

    // Create a buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();

    // Convert to WAV format
    const wavBlob = this.audioBufferToWav(renderedBuffer);

    return wavBlob;
  }

  /**
   * Converts an AudioBuffer to WAV Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // "RIFF" chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // "fmt " sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // subchunk1size
    setUint16(1); // audio format (1 = PCM)
    setUint16(numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numberOfChannels * 2); // byte rate
    setUint16(numberOfChannels * 2); // block align
    setUint16(16); // bits per sample

    // "data" sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // subchunk2size

    // Write interleaved data
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Converts a Blob to an AudioBuffer
   */
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }
}
