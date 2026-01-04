// src/lib/likesStore.ts
type Listener = () => void;

let likedSet = new Set<number>();
let likeCountMap: Record<number, number> = {};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

export const likesStore = {
  // read
  isLiked(id: number) {
    return likedSet.has(id);
  },
  getCount(id: number) {
    return likeCountMap[id];
  },

  // write (single recipe)
  set(id: number, liked: boolean, count?: number) {
    if (liked) likedSet.add(id);
    else likedSet.delete(id);

    if (typeof count === "number") likeCountMap[id] = count;

    emit();
  },

  // initialize from feed hydration
  setInitial(ids: number[]) {
    likedSet = new Set(ids);
    emit();
  },

  // initialize counts if you want
  setCounts(map: Record<number, number>) {
    likeCountMap = { ...map };
    emit();
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
