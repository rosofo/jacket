import type { ProxifyState } from "./types";

/**
 * Stores proxify's internal state for each proxy.
 *
 * We use a global store like this to sidestep the problem of storing internal state on proxied objects.
 *
 * ## Rationale
 *
 * The {@link Proxy} wrapper cannot store any state of its own. This leaves us with a few options:
 *
 * - Storing internal state on the proxied object in a private property (e.g. `__proxify_internal`)
 *
 *   This is suboptimal as it may change the behaviour of the object or code that interacts with it.
 * - Same as above, but copy the proxied object first.
 *
 *   Fixes the first problem by introducing an equally bad one. Not all objects can be safely copied, particularly intrinsic ones such as for WebGPU.
 *   Special casing all of these would be tedious and error-prone.
 * - Storing the state somewhere global and associating it with the **identity** of the proxy/proxied object.
 *
 *   This allows us to leave proxied objects completely untouched. The tradeoff is that extra care is required to avoid leaking memory.
 */
export class Tracking {
  /**
   * Associated state for proxies.
   *
   * We use a WeakMap to tie the lifetime of a proxy's state to the proxy itself. Once the proxy is dropped there should be
   * no strong references left to its state, allowing the state to be GC'd.
   */
  private static states: WeakMap<object, ProxifyState> = new WeakMap();

  static trackProxy(proxy: object, state: ProxifyState) {
    this.states.set(proxy, state);
  }
  static getState(proxy: object) {
    return this.states.get(proxy);
  }
}

declare global {
  var proxifyTracking: typeof Tracking;
}
globalThis.proxifyTracking = Tracking;
