import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaybackService, PlaybackState } from '../../../../core/services/playback.service';
import { AudioStateService } from '../../../../core/services/audio-state.service';

@Component({
  selector: 'app-transport-controls',
  imports: [CommonModule],
  templateUrl: './transport-controls.html',
  styleUrl: './transport-controls.scss',
  standalone: true
})
export class TransportControls {
  private playbackService = inject(PlaybackService);
  private audioStateService = inject(AudioStateService);

  playbackState$ = this.playbackService.playbackState$;
  currentAudioBuffer$ = this.audioStateService.currentAudioBuffer$;
  PlaybackState = PlaybackState;

  async onPlay(): Promise<void> {
    try {
      await this.playbackService.play();
      console.log('Playback started');
    } catch (error) {
      console.error('Failed to start playback:', error);
      alert('Failed to play audio. Make sure you have recorded something first.');
    }
  }

  onStop(): void {
    this.playbackService.stop();
    console.log('Playback stopped');
  }
}
