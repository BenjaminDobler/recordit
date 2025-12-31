import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private dbName = 'RecordItDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Opens the IndexedDB database
   */
  async openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('audioBlobs')) {
          db.createObjectStore('audioBlobs', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Saves data to an object store
   */
  async save<T>(storeName: string, data: T): Promise<void> {
    const db = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save data'));
    });
  }

  /**
   * Gets data from an object store by key
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(new Error('Failed to get data'));
    });
  }

  /**
   * Gets all data from an object store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(new Error('Failed to get all data'));
    });
  }

  /**
   * Deletes data from an object store
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete data'));
    });
  }
}
