
import { EventEmitter } from 'events';

// Use a global symbol to ensure a single instance of the emitter across hot reloads.
const EMITTER_SYMBOL = Symbol.for('firebase_error_emitter');

// Extend the NodeJS EventEmitter to type our events for better DX.
interface MyEmitter extends EventEmitter {
  emit(event: 'permission-error', error: Error): boolean;
  on(event: 'permission-error', listener: (error: Error) => void): this;
  off(event: 'permission-error', listener: (error: Error) => void): this;
}

/**
 * Returns a global event emitter instance.
 * This ensures that even with React's Fast Refresh, we're always using the same emitter instance
 * on the client-side, preventing duplicate listeners and missed events.
 */
function getGlobalEmitter(): MyEmitter {
  if (typeof window !== 'undefined') {
    const globalWithEmitter = globalThis as typeof globalThis & { [EMITTER_SYMBOL]?: MyEmitter };
    if (!globalWithEmitter[EMITTER_SYMBOL]) {
      globalWithEmitter[EMITTER_SYMBOL] = new EventEmitter() as MyEmitter;
      globalWithEmitter[EMITTER_SYMBOL].setMaxListeners(20); // Set a reasonable limit
    }
    return globalWithEmitter[EMITTER_SYMBOL]!;
  }
  // For server-side (though not used by the client listener), return a new instance.
  return new EventEmitter() as MyEmitter;
}

export const errorEmitter = getGlobalEmitter();
