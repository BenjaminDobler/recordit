import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioTrack } from '../../../../core/models/audio-track.model';

@Component({
  selector: 'app-track-effects-modal',
  imports: [CommonModule],
  templateUrl: './track-effects-modal.html',
  styleUrl: './track-effects-modal.scss',
  standalone: true
})
export class TrackEffectsModal {
  track = input.required<AudioTrack>();
  distortionAmount = input<number>(0);
  distortionEnabled = input<boolean>(false);
  delayTime = input<number>(0);
  delayFeedback = input<number>(0);
  delayWetDry = input<number>(0);
  delayEnabled = input<boolean>(false);

  close = output<void>();
  distortionChange = output<number>();
  distortionToggle = output<void>();
  delayTimeChange = output<number>();
  delayFeedbackChange = output<number>();
  delayWetDryChange = output<number>();
  delayToggle = output<void>();

  onClose(): void {
    this.close.emit();
  }

  onDistortionChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.distortionChange.emit(value);
  }

  onDistortionToggle(): void {
    this.distortionToggle.emit();
  }

  onDelayTimeChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.delayTimeChange.emit(value);
  }

  onDelayFeedbackChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.delayFeedbackChange.emit(value);
  }

  onDelayWetDryChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.delayWetDryChange.emit(value);
  }

  onDelayToggle(): void {
    this.delayToggle.emit();
  }
}
