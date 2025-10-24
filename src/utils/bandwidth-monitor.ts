// Simple client-side bandwidth monitoring
// Note: This only tracks approximate client-side data transfer

interface BandwidthStats {
  sessionBytes: number;
  sessionPhotos: number;
  lastReset: string;
}

const STORAGE_KEY = 'bandwidth_stats';

export const bandwidthMonitor = {
  track(bytes: number, type: 'photo' | 'data' = 'data') {
    const stats = this.getStats();
    stats.sessionBytes += bytes;
    if (type === 'photo') stats.sessionPhotos += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  },

  getStats(): BandwidthStats {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        sessionBytes: 0,
        sessionPhotos: 0,
        lastReset: new Date().toISOString(),
      };
    }
    return JSON.parse(stored);
  },

  reset() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionBytes: 0,
        sessionPhotos: 0,
        lastReset: new Date().toISOString(),
      })
    );
  },

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  },
};
