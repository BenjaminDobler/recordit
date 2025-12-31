import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecorderService, RecordingState } from '../../../../core/services/recorder.service';
import { PlaybackService } from '../../../../core/services/playback.service';
import { AudioStateService } from '../../../../core/services/audio-state.service';
import { ClipManagerService } from '../../../timeline/services/clip-manager.service';

@Component({
  selector: 'app-record-controls',
  imports: [CommonModule],
  templateUrl: './record-controls.html',
  styleUrl: './record-controls.scss',
  standalone: true
})
export class RecordControls {
  private recorderService = inject(RecorderService);
  private playbackService = inject(PlaybackService);
  private audioStateService = inject(AudioStateService);
  private clipManagerService = inject(ClipManagerService);

  recordingState$ = this.recorderService.recordingState$;
  RecordingState = RecordingState;
  lastRecordedBlob: Blob | null = null;
  clipCounter = 0;
  private currentState: RecordingState = RecordingState.Idle;
  private recordingStartPosition: number = 0;

  constructor() {
    // Track recording state
    this.recordingState$.subscribe(state => {
      this.currentState = state;
    });

    // Track recording duration for live preview
    this.recorderService.recordingDuration$.subscribe(duration => {
      if (this.currentState === RecordingState.Recording) {
        // Update live preview clip duration
        this.clipManagerService.updateRecordingPreview(duration);
      }
    });
  }

  onToggleRecord(): void {
    if (this.currentState === RecordingState.Recording) {
      this.onStop();
    } else {
      this.onRecord();
    }
  }

  async onRecord(): Promise<void> {
    try {
      // Get the armed track (or first track if none armed)
      const armedTrack = this.clipManagerService.getArmedTrack();
      const targetTrack = armedTrack || this.clipManagerService.getFirstTrack();

      if (!targetTrack) {
        alert('No track available. Please add a track first.');
        return;
      }

      // Get current playhead position
      this.recordingStartPosition = this.playbackService.getCurrentTime();

      // Start playing existing tracks for monitoring
      await this.playbackService.playAllTracks();

      // Start recording
      await this.recorderService.startRecording();

      // Create live preview clip
      this.clipManagerService.startRecordingPreview(targetTrack.id, this.recordingStartPosition);

      console.log('Recording started at position:', this.recordingStartPosition);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please grant microphone permissions.');
    }
  }

  async onStop(): Promise<void> {
    try {
      // Stop playback monitoring
      this.playbackService.stop();

      this.lastRecordedBlob = await this.recorderService.stopRecording();
      if (this.lastRecordedBlob) {
        console.log('Recording stopped. Blob size:', this.lastRecordedBlob.size);

        // Convert Blob to AudioBuffer
        const audioBuffer = await this.playbackService.blobToAudioBuffer(this.lastRecordedBlob);
        console.log('AudioBuffer created. Duration:', audioBuffer.duration, 'seconds');

        // Save to state for playback
        this.audioStateService.setLastRecordedBlob(this.lastRecordedBlob);
        this.audioStateService.setAudioBuffer(audioBuffer);
        this.playbackService.setAudioBuffer(audioBuffer);

        // Replace preview clip with actual clip
        this.clipCounter++;
        const clipName = `Recording ${this.clipCounter}`;
        this.clipManagerService.finishRecordingPreview(audioBuffer, clipName);

        console.log('Clip created:', clipName);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      // Remove preview clip on error
      this.clipManagerService.cancelRecordingPreview();
    }
  }
}
