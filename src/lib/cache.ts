/**
 * Shared LRU (Least-Recently-Used) in-memory cache.
 * Map preserves insertion order; we delete+re-insert on read to move items to the "end"
 * so the first entry is always the least-recently-used and can be evicted.
 */
export class LRUCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly defaultTTL: number  // ms
  ) {}

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh position (LRU: move to end)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // Evict LRU entry when at capacity
    if (this.store.size >= this.maxEntries) {
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) this.store.delete(lruKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  get size(): number {
    return this.store.size;
  }
}
