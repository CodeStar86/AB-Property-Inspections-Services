// Browser-side photo cache using IndexedDB to minimize Supabase egress
// Photos are stored locally and only fetched from server when missing

const DB_NAME = 'inspection-photo-cache';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const MAX_CACHE_SIZE_MB = 100; // Limit cache to 100MB
const CACHE_EXPIRY_DAYS = 7; // Clear photos older than 7 days

interface CachedPhoto {
  key: string; // inspection_id:photo_id
  dataUrl: string;
  timestamp: number;
  sizeBytes: number;
}

class PhotoCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async get(inspectionId: string, photoId: string): Promise<string | null> {
    try {
      await this.init();
      if (!this.db) return null;

      const key = `${inspectionId}:${photoId}`;
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const cached = request.result as CachedPhoto | undefined;
          
          if (!cached) {
            resolve(null);
            return;
          }

          // Check if cache is expired
          const ageMs = Date.now() - cached.timestamp;
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          
          if (ageDays > CACHE_EXPIRY_DAYS) {
            // Expired - delete and return null
            this.delete(inspectionId, photoId);
            resolve(null);
            return;
          }

          console.log(`[PhotoCache] HIT: ${key} (age: ${ageDays.toFixed(1)} days, size: ${(cached.sizeBytes / 1024).toFixed(1)} KB)`);
          resolve(cached.dataUrl);
        };

        request.onerror = () => {
          console.error('[PhotoCache] Get error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PhotoCache] Get failed:', error);
      return null;
    }
  }

  async set(inspectionId: string, photoId: string, dataUrl: string): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const key = `${inspectionId}:${photoId}`;
      const sizeBytes = new Blob([dataUrl]).size;

      // Check total cache size before adding
      const currentSize = await this.getTotalSize();
      const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;

      if (currentSize + sizeBytes > maxSizeBytes) {
        console.warn(`[PhotoCache] Cache full (${(currentSize / 1024 / 1024).toFixed(1)} MB), cleaning old entries...`);
        await this.cleanOldest(sizeBytes);
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const cached: CachedPhoto = {
          key,
          dataUrl,
          timestamp: Date.now(),
          sizeBytes,
        };

        const request = store.put(cached);

        request.onsuccess = () => {
          console.log(`[PhotoCache] STORED: ${key} (size: ${(sizeBytes / 1024).toFixed(1)} KB)`);
          resolve();
        };

        request.onerror = () => {
          console.error('[PhotoCache] Set error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[PhotoCache] Set failed:', error);
    }
  }

  async delete(inspectionId: string, photoId: string): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const key = `${inspectionId}:${photoId}`;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log(`[PhotoCache] DELETED: ${key}`);
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[PhotoCache] Delete failed:', error);
    }
  }

  async deleteInspection(inspectionId: string): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        let deleted = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
          
          if (cursor) {
            const cached = cursor.value as CachedPhoto;
            if (cached.key.startsWith(`${inspectionId}:`)) {
              cursor.delete();
              deleted++;
            }
            cursor.continue();
          } else {
            console.log(`[PhotoCache] Deleted ${deleted} photos for inspection ${inspectionId}`);
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[PhotoCache] Delete inspection failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[PhotoCache] Cache cleared');
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[PhotoCache] Clear failed:', error);
    }
  }

  private async getTotalSize(): Promise<number> {
    try {
      await this.init();
      if (!this.db) return 0;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const photos = request.result as CachedPhoto[];
          const totalSize = photos.reduce((sum, p) => sum + p.sizeBytes, 0);
          resolve(totalSize);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[PhotoCache] Get total size failed:', error);
      return 0;
    }
  }

  private async cleanOldest(neededBytes: number): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(); // Oldest first

        let freedBytes = 0;
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
          
          if (cursor && freedBytes < neededBytes) {
            const cached = cursor.value as CachedPhoto;
            freedBytes += cached.sizeBytes;
            deletedCount++;
            cursor.delete();
            cursor.continue();
          } else {
            console.log(`[PhotoCache] Cleaned ${deletedCount} old photos, freed ${(freedBytes / 1024 / 1024).toFixed(1)} MB`);
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[PhotoCache] Clean oldest failed:', error);
    }
  }

  async getStats(): Promise<{ count: number; sizeBytes: number; sizeMB: number }> {
    try {
      await this.init();
      if (!this.db) return { count: 0, sizeBytes: 0, sizeMB: 0 };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const photos = request.result as CachedPhoto[];
          const sizeBytes = photos.reduce((sum, p) => sum + p.sizeBytes, 0);
          resolve({
            count: photos.length,
            sizeBytes,
            sizeMB: sizeBytes / (1024 * 1024),
          });
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[PhotoCache] Get stats failed:', error);
      return { count: 0, sizeBytes: 0, sizeMB: 0 };
    }
  }

  async batchGet(inspectionId: string, photoIds: string[]): Promise<Map<string, string>> {
    try {
      await this.init();
      if (!this.db) return new Map();

      const results = new Map<string, string>();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        let completed = 0;
        const total = photoIds.length;

        if (total === 0) {
          resolve(results);
          return;
        }

        photoIds.forEach(photoId => {
          const key = `${inspectionId}:${photoId}`;
          const request = store.get(key);

          request.onsuccess = () => {
            const cached = request.result as CachedPhoto | undefined;
            
            if (cached) {
              // Check if cache is expired
              const ageMs = Date.now() - cached.timestamp;
              const ageDays = ageMs / (1000 * 60 * 60 * 24);
              
              if (ageDays <= CACHE_EXPIRY_DAYS) {
                results.set(photoId, cached.dataUrl);
              }
            }

            completed++;
            if (completed === total) {
              console.log(`[PhotoCache] Batch GET: ${results.size}/${total} photos from cache`);
              resolve(results);
            }
          };

          request.onerror = () => {
            completed++;
            if (completed === total) {
              resolve(results);
            }
          };
        });
      });
    } catch (error) {
      console.error('[PhotoCache] Batch get failed:', error);
      return new Map();
    }
  }
}

export const photoCache = new PhotoCache();
