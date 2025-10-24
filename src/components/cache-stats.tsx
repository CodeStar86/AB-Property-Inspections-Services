import { useState, useEffect } from 'react';
import { photoCache } from '../lib/photo-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Database, Trash2 } from 'lucide-react';

export function CacheStats() {
  const [stats, setStats] = useState({ count: 0, sizeBytes: 0, sizeMB: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const cacheStats = await photoCache.getStats();
    setStats(cacheStats);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Clear all cached photos? They will be re-downloaded when needed.')) return;
    
    await photoCache.clear();
    await loadStats();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="w-4 h-4" />
            <span>Loading cache stats...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Photo Cache
        </CardTitle>
        <CardDescription>
          Photos are cached locally to reduce data usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl">{stats.count}</div>
            <div className="text-sm text-muted-foreground">Cached Photos</div>
          </div>
          <div>
            <div className="text-2xl">{stats.sizeMB.toFixed(1)} MB</div>
            <div className="text-sm text-muted-foreground">Cache Size</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>💡 Cached photos load instantly without using bandwidth</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          disabled={stats.count === 0}
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Cache
        </Button>
      </CardContent>
    </Card>
  );
}
