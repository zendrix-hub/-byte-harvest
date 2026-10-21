import { signal } from '@preact/signals';
import type { Packet } from './types';

// Lesson content ships as static JSON and loads as its own precached chunk,
// following the lazy-load pattern of ../qtext.ts.
const loaders = import.meta.glob<Packet[]>('./*.json', { import: 'default' });

const cache = new Map<string, Packet[]>();
let byId: Map<string, Packet> | null = null;
let pending: Promise<Packet[]> | null = null;

/** Bumps once every lesson-content chunk has loaded, so components can re-read the cache. */
export const packetsVersion = signal(0);

function rebuildIndex(): Map<string, Packet> {
  const index = new Map<string, Packet>();
  for (const packets of cache.values()) {
    for (const p of packets) index.set(p.id, p);
  }
  return index;
}

/** Loads every lesson-content file once and caches the merged packet list. */
export function loadPackets(): Promise<Packet[]> {
  if (!pending) {
    pending = Promise.all(
      Object.entries(loaders).map(async ([path, load]) => {
        cache.set(path, await load());
      }),
    ).then(() => {
      byId = rebuildIndex();
      packetsVersion.value++;
      return [...byId.values()];
    });
  }
  return pending;
}

/** Sync lookup from the cache; null before loadPackets() resolves, or for an unknown id. */
export function getPacket(id: string): Packet | null {
  return byId?.get(id) ?? null;
}

/** Cached packets for a topic (a TOPICS key); empty before loadPackets() resolves. */
export function packetsFor(topic: string): Packet[] {
  return byId ? [...byId.values()].filter((p) => p.topic === topic) : [];
}
