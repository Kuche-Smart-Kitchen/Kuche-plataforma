const runtimeMemoryStore = new Map<string, string>();

export const runtimeStore = {
  getItem(key: string): string | null {
    return runtimeMemoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    runtimeMemoryStore.set(key, value);
  },
  removeItem(key: string): void {
    runtimeMemoryStore.delete(key);
  },
};