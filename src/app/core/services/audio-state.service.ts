import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioStateService {
  private currentAudioBufferSubject = new BehaviorSubject<AudioBuffer | null>(null);
  private lastRecordedBlobSubject = new BehaviorSubject<Blob | null>(null);

  currentAudioBuffer$: Observable<AudioBuffer | null> = this.currentAudioBufferSubject.asObservable();
  lastRecordedBlob$: Observable<Blob | null> = this.lastRecordedBlobSubject.asObservable();

  constructor() {}

  /**
   * Sets the current audio buffer
   */
  setAudioBuffer(buffer: AudioBuffer | null): void {
    this.currentAudioBufferSubject.next(buffer);
  }

  /**
   * Gets the current audio buffer
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.currentAudioBufferSubject.value;
  }

  /**
   * Sets the last recorded blob
   */
  setLastRecordedBlob(blob: Blob | null): void {
    this.lastRecordedBlobSubject.next(blob);
  }

  /**
   * Gets the last recorded blob
   */
  getLastRecordedBlob(): Blob | null {
    return this.lastRecordedBlobSubject.value;
  }
}
