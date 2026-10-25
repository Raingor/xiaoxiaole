export class ObjectPool<T> {
  private free: T[] = [];
  private activeCount = 0;

  constructor(
    private factory: () => T,
    private reset: (item: T) => void,
    private initial = 0,
  ) {
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }

  acquire(): T {
    this.activeCount++;
    const item = this.free.pop();
    if (item) return item;
    return this.factory();
  }

  release(item: T): void {
    this.activeCount--;
    this.reset(item);
    this.free.push(item);
  }

  get active(): number {
    return this.activeCount;
  }

  get freeCount(): number {
    return this.free.length;
  }

  get total(): number {
    return this.free.length + this.activeCount;
  }
}
