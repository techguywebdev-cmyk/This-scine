// Tiny signal so the launch animation can wait for the first feed load
let ready = false; const subs = new Set();
export const markBootReady = () => { if (ready) return; ready = true; subs.forEach((f) => f()); };
export const onBootReady = (f) => { if (ready) { f(); return () => {}; } subs.add(f); return () => subs.delete(f); };
