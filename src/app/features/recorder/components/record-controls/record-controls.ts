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

  constructor() {
    // Track recording state
    this.recordingState$.subscribe(state => {
      this.currentState = state;
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
      await this.recorderService.startRecording();
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please grant microphone permissions.');
    }
  }

  async onStop(): Promise<void> {
    try {
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

        // Add clip to the armed track (or first track if none armed)
        const armedTrack = this.clipManagerService.getArmedTrack();
        const targetTrack = armedTrack || this.clipManagerService.getFirstTrack();

        if (targetTrack) {
          this.clipCounter++;
          const clipName = `Recording ${this.clipCounter}`;
          this.clipManagerService.createClip(targetTrack.id, audioBuffer, clipName, 0);
          console.log(`Clip added to ${armedTrack ? 'armed' : 'first'} track:`, clipName);
        } else {
          alert('No track available. Please add a track first.');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }
}
