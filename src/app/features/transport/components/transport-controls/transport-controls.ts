import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlaybackService, PlaybackState } from '../../../../core/services/playback.service';
import { ClipManagerService } from '../../../timeline/services/clip-manager.service';
import { RecordControls } from '../../../recorder/components/record-controls/record-controls';

@Component({
  selector: 'app-transport-controls',
  imports: [CommonModule, RecordControls],
  templateUrl: './transport-controls.html',
  styleUrl: './transport-controls.scss',
  standalone: true
})
export class TransportControls {
  private playbackService = inject(PlaybackService);
  private clipManagerService = inject(ClipManagerService);

  playbackState$ = this.playbackService.playbackState$;
  playbackState = toSignal(this.playbackService.playbackState$, { initialValue: PlaybackState.Idle });
  masterVolume = toSignal(this.playbackService.masterVolume$, { initialValue: 0.8 });
  tracks = toSignal(this.clipManagerService.tracks$, { initialValue: [] });

  // Check if there are any clips to play
  hasClipsToPlay = computed(() => {
    return this.tracks().some(track => track.clips.length > 0);
  });

  PlaybackState = PlaybackState;

  async onPlay(): Promise<void> {
    try {
      await this.playbackService.playAllTracks();
      console.log('Multi-track playback started');
    } catch (error) {
      console.error('Failed to start playback:', error);
      alert('Failed to play audio. Make sure you have recorded something first.');
    }
  }

  onStop(): void {
    this.playbackService.stop();
    console.log('Playback stopped');
  }

  onMasterVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseInt(target.value) / 100;
    this.playbackService.setMasterVolume(volume);
  }
}
