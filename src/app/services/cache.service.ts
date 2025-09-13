import { Injectable } from '@angular/core';

interface CacheEntry {
  ts: number;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry>();
 
  get<T>(key: string, ttl = 60_000): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }
  set(key: string, data: any) {
    this.cache.set(key, { ts: Date.now(), data });
  }
  clear(key?: string) {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
}
