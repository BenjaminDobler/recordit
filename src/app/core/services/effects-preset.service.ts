import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Effect, EffectType } from '../models/effect.model';

export interface EffectPreset {
  id: string;
  name: string;
  effects: Array<{
    type: EffectType;
    enabled: boolean;
    parameters: Record<string, number>;
  }>;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class EffectsPresetService {
  private readonly STORAGE_KEY = 'recordit-effect-presets';
  private presetsSubject = new BehaviorSubject<EffectPreset[]>([]);

  presets$: Observable<EffectPreset[]> = this.presetsSubject.asObservable();

  constructor() {
    this.loadPresetsFromStorage();
  }

  /**
   * Load presets from localStorage
   */
  private loadPresetsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const presets = JSON.parse(stored);
        this.presetsSubject.next(presets);
      }
    } catch (error) {
      console.error('Failed to load presets from storage:', error);
    }
  }

  /**
   * Save presets to localStorage
   */
  private savePresetsToStorage(presets: EffectPreset[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save presets to storage:', error);
    }
  }

  /**
   * Get all presets
   */
  getPresets(): EffectPreset[] {
    return this.presetsSubject.value;
  }

  /**
   * Save a new preset
   */
  savePreset(name: string, effects: Effect[]): void {
    const preset: EffectPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      effects: effects.map(e => ({
        type: e.type,
        enabled: e.enabled,
        parameters: { ...e.parameters }
      })),
      createdAt: Date.now()
    };

    const presets = [...this.presetsSubject.value, preset];
    this.presetsSubject.next(presets);
    this.savePresetsToStorage(presets);
  }

  /**
   * Delete a preset
   */
  deletePreset(presetId: string): void {
    const presets = this.presetsSubject.value.filter(p => p.id !== presetId);
    this.presetsSubject.next(presets);
    this.savePresetsToStorage(presets);
  }

  /**
   * Update a preset
   */
  updatePreset(presetId: string, name: string, effects: Effect[]): void {
    const presets = this.presetsSubject.value.map(p => {
      if (p.id === presetId) {
        return {
          ...p,
          name,
          effects: effects.map(e => ({
            type: e.type,
            enabled: e.enabled,
            parameters: { ...e.parameters }
          }))
        };
      }
      return p;
    });

    this.presetsSubject.next(presets);
    this.savePresetsToStorage(presets);
  }

  /**
   * Get a preset by ID
   */
  getPreset(presetId: string): EffectPreset | undefined {
    return this.presetsSubject.value.find(p => p.id === presetId);
  }
}
