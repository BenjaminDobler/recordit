import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioTrack } from '../../../core/models/audio-track.model';
import { EffectType } from '../../../core/models/effect.model';

interface StompBox {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
  position: { x: number; y: number };
  color: string;
}

@Component({
  selector: 'app-effects-panel',
  imports: [CommonModule],
  templateUrl: './effects-panel.html',
  styleUrl: './effects-panel.scss',
  standalone: true
})
export class EffectsPanel {
  track = input.required<AudioTrack>();
  visible = input.required<boolean>();

  close = output<void>();
  effectToggle = output<{ trackId: string; effectType: EffectType }>();
  effectChange = output<{ trackId: string; effectType: EffectType; parameters: Record<string, number> }>();

  // Dragging state
  draggedBox = signal<string | null>(null);
  dragOffset = { x: 0, y: 0 };

  EffectType = EffectType;

  // Effect metadata
  effectMetadata: Record<EffectType, { name: string; color: string; knobs: Array<{ param: string; label: string; min: number; max: number }> }> = {
    [EffectType.Boost]: {
      name: 'Boost',
      color: '#4a5568',
      knobs: [
        { param: 'gain', label: 'GAIN', min: 0, max: 100 }
      ]
    },
    [EffectType.Distortion]: {
      name: 'Distortion',
      color: '#e63946',
      knobs: [
        { param: 'amount', label: 'DRIVE', min: 0, max: 100 }
      ]
    },
    [EffectType.Flanger]: {
      name: 'Flanger',
      color: '#d946ef',
      knobs: [
        { param: 'rate', label: 'RATE', min: 0, max: 100 },
        { param: 'depth', label: 'DEPTH', min: 0, max: 100 },
        { param: 'feedback', label: 'FEEDBACK', min: 0, max: 100 }
      ]
    },
    [EffectType.Delay]: {
      name: 'Delay',
      color: '#3b82f6',
      knobs: [
        { param: 'time', label: 'TIME', min: 0, max: 100 },
        { param: 'feedback', label: 'FEEDBACK', min: 0, max: 100 },
        { param: 'wetDry', label: 'MIX', min: 0, max: 100 }
      ]
    },
    [EffectType.Reverb]: {
      name: 'Reverb',
      color: '#a0522d',
      knobs: [
        { param: 'roomSize', label: 'SIZE', min: 0, max: 100 },
        { param: 'damping', label: 'DAMP', min: 0, max: 100 },
        { param: 'wetDry', label: 'MIX', min: 0, max: 100 }
      ]
    },
    [EffectType.Tremolo]: {
      name: 'Tremolo',
      color: '#06b6d4',
      knobs: [
        { param: 'rate', label: 'RATE', min: 0, max: 100 },
        { param: 'depth', label: 'DEPTH', min: 0, max: 100 }
      ]
    }
  };

  // Convert track effects to stomp boxes
  stompBoxes = computed(() => {
    const track = this.track();
    const allEffectTypes = [
      EffectType.Boost,
      EffectType.Distortion,
      EffectType.Flanger,
      EffectType.Delay,
      EffectType.Reverb,
      EffectType.Tremolo
    ];

    return allEffectTypes.map((type, index) => {
      const effect = track.effects.find(e => e.type === type);
      const metadata = this.effectMetadata[type];

      return {
        id: `${track.id}-${type}`,
        type,
        enabled: effect?.enabled || false,
        parameters: effect?.parameters || this.getDefaultParameters(type),
        position: { x: 20 + (index % 3) * 200, y: 20 + Math.floor(index / 3) * 280 },
        color: metadata.color
      };
    });
  });

  getDefaultParameters(type: EffectType): Record<string, number> {
    const knobs = this.effectMetadata[type].knobs;
    const defaults: Record<string, number> = {};
    knobs.forEach(knob => {
      defaults[knob.param] = 50; // Default to middle value
    });
    return defaults;
  }

  onBackdropClick(): void {
    this.close.emit();
  }

  onPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onFootswitchClick(box: StompBox): void {
    this.effectToggle.emit({
      trackId: this.track().id,
      effectType: box.type
    });
  }

  onKnobChange(box: StompBox, param: string, value: number): void {
    const updatedParams = { ...box.parameters, [param]: value };
    this.effectChange.emit({
      trackId: this.track().id,
      effectType: box.type,
      parameters: updatedParams
    });
  }

  onBoxMouseDown(event: MouseEvent, box: StompBox): void {
    if ((event.target as HTMLElement).closest('.knob-container, .footswitch')) {
      return; // Don't drag when interacting with controls
    }

    this.draggedBox.set(box.id);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dragOffset.x = event.clientX - rect.left;
    this.dragOffset.y = event.clientY - rect.top;

    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseup', this.onDocumentMouseUp);
  }

  private onDocumentMouseMove = (event: MouseEvent): void => {
    const boxId = this.draggedBox();
    if (!boxId) return;

    const panel = document.querySelector('.pedalboard-canvas') as HTMLElement;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const newX = event.clientX - rect.left - this.dragOffset.x;
    const newY = event.clientY - rect.top - this.dragOffset.y;

    // Update position (in a real app, this would update a service)
    const box = document.getElementById(boxId) as HTMLElement;
    if (box) {
      box.style.left = `${Math.max(0, newX)}px`;
      box.style.top = `${Math.max(0, newY)}px`;
    }
  };

  private onDocumentMouseUp = (): void => {
    this.draggedBox.set(null);
    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
  };

  getKnobRotation(value: number): number {
    // Map 0-100 to -135deg to +135deg (270 degree range)
    return -135 + (value / 100) * 270;
  }
}
