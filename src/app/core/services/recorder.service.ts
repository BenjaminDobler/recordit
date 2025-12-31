import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum RecordingState {
  Idle = 'idle',
  Recording = 'recording',
  Stopped = 'stopped'
}

@Injectable({
  providedIn: 'root'
})
export class RecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private recordingStateSubject = new BehaviorSubject<RecordingState>(RecordingState.Idle);
  private recordingStartTime: number = 0;
  private recordingDurationSubject = new BehaviorSubject<number>(0);
  private durationInterval: number | null = null;

  recordingState$: Observable<RecordingState> = this.recordingStateSubject.asObservable();
  recordingDuration$: Observable<number> = this.recordingDurationSubject.asObservable();

  constructor() {}

  /**
   * Requests microphone access from the browser
   * @returns MediaStream from the microphone
   */
  async requestMicrophoneAccess(): Promise<MediaStream> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      return this.mediaStream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  /**
   * Starts recording audio from the microphone
   * @param stream Optional MediaStream to use, if not provided will request microphone access
   */
  async startRecording(stream?: MediaStream): Promise<void> {
    try {
      // Get stream if not provided
      if (!stream) {
        stream = await this.requestMicrophoneAccess();
      }

      // Reset audio chunks
      this.audioChunks = [];

      // Create MediaRecorder with WebM format
      const options = { mimeType: 'audio/webm' };
      this.mediaRecorder = new MediaRecorder(stream, options);

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start();
      this.recordingStartTime = Date.now();
      this.recordingDurationSubject.next(0);
      this.recordingStateSubject.next(RecordingState.Recording);

      // Update duration every 100ms
      this.durationInterval = window.setInterval(() => {
        const elapsed = (Date.now() - this.recordingStartTime) / 1000;
        this.recordingDurationSubject.next(elapsed);
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      this.recordingStateSubject.next(RecordingState.Idle);
      throw error;
    }
  }

  /**
   * Stops recording and returns the recorded audio as a Blob
   * @returns Promise that resolves with the audio Blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      // Clear duration update interval
      if (this.durationInterval !== null) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordingStateSubject.next(RecordingState.Stopped);
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.recordingStateSubject.next(RecordingState.Idle);
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Gets the current recording level (0-1)
   * Useful for level meters during recording
   */
  getRecordingLevel(): Observable<number> {
    // TODO: Implement using AnalyserNode in Phase 15
    return new BehaviorSubject<number>(0).asObservable();
  }

  /**
   * Releases the microphone stream
   */
  releaseMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Gets the current recording state
   */
  getRecordingState(): RecordingState {
    return this.recordingStateSubject.value;
  }
}
