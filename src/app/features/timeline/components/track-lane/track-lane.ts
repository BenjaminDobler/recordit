import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioTrack } from '../../../../core/models/audio-track.model';
import { EffectType } from '../../../../core/models/effect.model';
import { ClipItem } from '../clip-item/clip-item';
import { EffectsPanel } from '../../../../shared/components/effects-panel/effects-panel';

@Component({
  selector: 'app-track-lane',
  imports: [CommonModule, ClipItem, EffectsPanel],
  templateUrl: './track-lane.html',
  styleUrl: './track-lane.scss',
  standalone: true
})
export class TrackLane {
  track = input.required<AudioTrack>();
  pixelsPerSecond = input<number>(100);
  currentPlayheadTime = input<number>(0);

  showEffectsPanel = signal(false);

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
  trimChange = output<{ clipId: string; trimStart: number; trimEnd: number }>();
  clipSplit = output<{ clipId: string; splitTime: number }>();
  clipDuplicate = output<string>();
  clipDelete = output<string>();
  distortionChange = output<{ trackId: string; amount: number }>();
  distortionToggle = output<string>();
  delayChange = output<{ trackId: string; time: number; feedback: number; wetDry: number }>();
  delayToggle = output<string>();
  effectToggle = output<{ trackId: string; effectType: EffectType }>();
  effectChange = output<{ trackId: string; effectType: EffectType; parameters: Record<string, number> }>();

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

  openEffectsPanel(): void {
    this.showEffectsPanel.set(true);
  }

  closeEffectsPanel(): void {
    this.showEffectsPanel.set(false);
  }

  onEffectToggle(event: { trackId: string; effectType: EffectType }): void {
    this.effectToggle.emit(event);
  }

  onEffectChange(event: { trackId: string; effectType: EffectType; parameters: Record<string, number> }): void {
    this.effectChange.emit(event);
  }

  onClipTrimChange(event: { clipId: string; trimStart: number; trimEnd: number }): void {
    this.trimChange.emit(event);
  }

  onClipSplit(event: { clipId: string; splitTime: number }): void {
    this.clipSplit.emit(event);
  }

  onClipDuplicate(clipId: string): void {
    this.clipDuplicate.emit(clipId);
  }

  onClipDelete(clipId: string): void {
    this.clipDelete.emit(clipId);
  }
}
