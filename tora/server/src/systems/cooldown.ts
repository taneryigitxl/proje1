export class Cooldown {
  private hits = new Map<string, number[]>();

  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  forget(key: string): void {
    this.hits.delete(key);
    this.hits.delete(`${key}:burst`);
  }
}
