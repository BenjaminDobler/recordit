import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioTrack } from '../../../../core/models/audio-track.model';
import { EffectType } from '../../../../core/models/effect.model';
import { ClipItem } from '../clip-item/clip-item';

@Component({
  selector: 'app-track-lane',
  imports: [CommonModule, ClipItem],
  templateUrl: './track-lane.html',
  styleUrl: './track-lane.scss',
  standalone: true
})
export class TrackLane {
  track = input.required<AudioTrack>();
  pixelsPerSecond = input<number>(100);

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

  onDistortionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const amount = parseInt(target.value);
    this.distortionChange.emit({ trackId: this.track().id, amount });
  }

  onDistortionToggle(): void {
    this.distortionToggle.emit(this.track().id);
  }

  onDelayTimeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const time = parseInt(target.value);
    this.delayChange.emit({
      trackId: this.track().id,
      time,
      feedback: this.delayFeedback(),
      wetDry: this.delayWetDry()
    });
  }

  onDelayFeedbackChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const feedback = parseInt(target.value);
    this.delayChange.emit({
      trackId: this.track().id,
      time: this.delayTime(),
      feedback,
      wetDry: this.delayWetDry()
    });
  }

  onDelayWetDryChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const wetDry = parseInt(target.value);
    this.delayChange.emit({
      trackId: this.track().id,
      time: this.delayTime(),
      feedback: this.delayFeedback(),
      wetDry
    });
  }

  onDelayToggle(): void {
    this.delayToggle.emit(this.track().id);
  }
}
