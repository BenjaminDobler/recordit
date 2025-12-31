import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioTrack } from '../../../../core/models/audio-track.model';
import { EffectType } from '../../../../core/models/effect.model';
import { ClipItem } from '../clip-item/clip-item';
import { TrackEffectsModal } from '../track-effects-modal/track-effects-modal';

@Component({
  selector: 'app-track-lane',
  imports: [CommonModule, ClipItem, TrackEffectsModal],
  templateUrl: './track-lane.html',
  styleUrl: './track-lane.scss',
  standalone: true
})
export class TrackLane {
  track = input.required<AudioTrack>();
  pixelsPerSecond = input<number>(100);

  showEffectsModal = signal(false);

  // Computed effect states
  distortionEffect = computed(() => this.track().effects.find(e => e.type === EffectType.Distortion));
  distortionAmount = computed(() => this.distortionEffect()?.parameters['amount'] ?? 0);
  distortionEnabled = computed(() => this.distortionEffect()?.enabled ?? false);

  delayEffect = computed(() => this.track().effects.find(e => e.type === EffectType.Delay));
  delayTime = computed(() => this.delayEffect()?.parameters['time'] ?? 30);
  delayFeedback = computed(() => this.delayEffect()?.parameters['feedback'] ?? 30);
  delayWetDry = computed(() => this.delayEffect()?.parameters['wetDry'] ?? 50);
  delayEnabled = computed(() => this.delayEffect()?.enabled ?? false);

  // Events
  armToggle = output<string>();
  trackDelete = output<string>();
  volumeChange = output<{ trackId: string; volume: number }>();
  muteToggle = output<string>();
  soloToggle = output<string>();
  clipPositionChange = output<{ clipId: string; newStartTime: number }>();
  distortionChange = output<{ trackId: string; amount: number }>();
  distortionToggle = output<string>();
  delayChange = output<{ trackId: string; time: number; feedback: number; wetDry: number }>();
  delayToggle = output<string>();

  onArmClick(): void {
    this.armToggle.emit(this.track().id);
  }

  onDeleteClick(): void {
    this.trackDelete.emit(this.track().id);
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = parseInt(target.value) / 100;
    this.volumeChange.emit({ trackId: this.track().id, volume });
  }

  onMuteClick(): void {
    this.muteToggle.emit(this.track().id);
  }

  onSoloClick(): void {
    this.soloToggle.emit(this.track().id);
  }

  onClipPositionChange(event: { clipId: string; newStartTime: number }): void {
    this.clipPositionChange.emit(event);
  }

  onDistortionChange(amount: number | Event): void {
    const value = typeof amount === 'number' ? amount : parseInt((amount.target as HTMLInputElement).value);
    this.distortionChange.emit({ trackId: this.track().id, amount: value });
  }

  onDistortionToggle(): void {
    this.distortionToggle.emit(this.track().id);
  }

  onDelayTimeChange(time: number | Event): void {
    const value = typeof time === 'number' ? time : parseInt((time.target as HTMLInputElement).value);
    this.delayChange.emit({
      trackId: this.track().id,
      time: value,
      feedback: this.delayFeedback(),
      wetDry: this.delayWetDry()
    });
  }

  onDelayFeedbackChange(feedback: number | Event): void {
    const value = typeof feedback === 'number' ? feedback : parseInt((feedback.target as HTMLInputElement).value);
    this.delayChange.emit({
      trackId: this.track().id,
      time: this.delayTime(),
      feedback: value,
      wetDry: this.delayWetDry()
    });
  }

  onDelayWetDryChange(wetDry: number | Event): void {
    const value = typeof wetDry === 'number' ? wetDry : parseInt((wetDry.target as HTMLInputElement).value);
    this.delayChange.emit({
      trackId: this.track().id,
      time: this.delayTime(),
      feedback: this.delayFeedback(),
      wetDry: value
    });
  }

  onDelayToggle(): void {
    this.delayToggle.emit(this.track().id);
  }

  openEffectsModal(): void {
    this.showEffectsModal.set(true);
  }

  closeEffectsModal(): void {
    this.showEffectsModal.set(false);
  }
}
