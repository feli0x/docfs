export interface CacheEntry<T> {
  value: T;
  expires: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(
    private maxSize: number,
    private ttl: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    // refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const entry: CacheEntry<T> = { value, expires: Date.now() + this.ttl };
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, entry);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
