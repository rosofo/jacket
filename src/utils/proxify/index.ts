// Note: Will probs move to being a library at some point
// Note: Currently a WIP

import { CallChain } from "./call-chain";
import { Tracking } from "./track";
import type { ProxifyState } from "./types";

type BaseTypes =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

interface JsProxyProperties<T extends object, K extends keyof T> {
  value: T[K];
  receiver: T;
  target: T;
}

/**
 * - target: the object being accessed, e.g. target['property'] or target.property
 * - receiver: the value of `this` for the current getter
 */
function proxifyValue<T extends object, K extends keyof T, C extends object>(
  { value, receiver, target }: JsProxyProperties<T, K>,
  currentCaller: CallChain,
  options: ProxifyOptions<C>,
  returnRaw?: boolean
) {
  const valueCallbackReturn = options.valueCallback(currentCaller, value);
  const normalisedValue =
    valueCallbackReturn?.value === undefined
      ? value
      : valueCallbackReturn.value;
  if (valueCallbackReturn?.context !== undefined) {
    currentCaller = withContext(currentCaller, valueCallbackReturn.context);
  }
  returnRaw = valueCallbackReturn?.returnRaw || returnRaw;

  const state: ProxifyState = {
    rawValue: normalisedValue,
    valueCallbackResult: valueCallbackReturn,
    callChain: currentCaller,
  };

  if (normalisedValue instanceof Promise) {
    const promise = new Promise((resolve, reject) => {
      normalisedValue
        .then((resolvedValue) => {
          resolve(
            proxifyValue(
              { value: resolvedValue, receiver, target },
              currentCaller.extend({ type: "resolved" }),
              options,
              returnRaw
            )
          );
        })
        .catch((rejectedValue) => {
          reject(
            proxifyValue(
              { value: rejectedValue, receiver, target },
              currentCaller.extend({ type: "rejected" }),
              options,
              returnRaw
            )
          );
        });
    });
    Tracking.trackProxy(promise, state);
    return promise; // TODO proxify that too
  } else if (normalisedValue instanceof Function) {
    // Do not make this an arrow function, it wont work for *this* reasons :p
    const f = function (...actualArgs: unknown[]) {
      // @ts-ignore
      const t = this === receiver ? target : this;
      const actualFunction = (...args: unknown[]) => {
        const result = normalisedValue.apply(t, args);
        return result;
      };
      currentCaller = currentCaller.extend({ type: "executed" });
      const functionExeccallbackReturn = options.functionExecCallback(
        currentCaller,
        actualArgs,
        actualFunction
      );
      returnRaw = functionExeccallbackReturn?.returnRaw || returnRaw;
      if (functionExeccallbackReturn?.context !== undefined) {
        currentCaller = withContext(
          currentCaller,
          functionExeccallbackReturn.context
        );
      }
      const result =
        functionExeccallbackReturn === undefined
          ? actualFunction(...actualArgs)
          : functionExeccallbackReturn.value;
      const p = proxifyValue(
        { value: result, receiver, target },
        currentCaller,
        options,
        returnRaw
      );
      return p;
    };
    Tracking.trackProxy(f, state);
    return f;
  } else if (normalisedValue instanceof Object) {
    if (returnRaw) {
      return normalisedValue;
    }

    const p = new Proxy(normalisedValue, handler(currentCaller, options));
    Tracking.trackProxy(p, state);
    return p;
  }
  return normalisedValue;
}
function handler<C extends object>(
  caller: CallChain = new CallChain([], undefined),
  options: ProxifyOptions<C>
) {
  return {
    get(
      target: Record<string, unknown>,
      property: string,
      receiver: Record<string, unknown>
    ): unknown {
      const value = target[property];
      const currentCaller = caller.extend({
        name: property,
        type: typeof value,
        value,
      });
      return proxifyValue<Record<string, unknown>, string, C>(
        { value, receiver, target },
        currentCaller,
        options
      );
    },
  };
}

type ProxifyReturn<C> = {
  value?: unknown;
  context?: C;
  returnRaw?: boolean;
} | void;

export interface ProxifyOptions<C> {
  valueCallback: (caller: CallChain, rawValue: unknown) => ProxifyReturn<C>;
  functionExecCallback: (
    caller: CallChain,
    args: unknown[],
    func: (...args: unknown[]) => unknown
  ) => ProxifyReturn<C>;
  context: C;
}

export function proxify<T extends object, C>(
  target: T,
  proxyifyOptions: Partial<ProxifyOptions<C>> = {}
): T {
  const defaults: Omit<ProxifyOptions<C>, "context"> = {
    valueCallback: () => {},
    functionExecCallback: () => {},
  };
  const options = { ...defaults, ...proxyifyOptions };
  const p = new Proxy(
    target,
    // @ts-ignore
    handler(new CallChain([], options.context), options)
  );
  const state = { callChain: new CallChain([], options.context) };
  Tracking.trackProxy(p, state);
  return p;
}

export function unproxify<T>(proxied: T): T {
  if (proxied === null || proxied === undefined || typeof proxied !== "object")
    return proxied as T;

  const state = Tracking.getState(proxied);
  if (state !== undefined) {
    return state.rawValue as T;
  }
  // There was no associated state, meaning we're dealing with a plain unproxied value.

  if (proxied instanceof Array) {
    return proxied.map(unproxify) as T;
  } else {
    // can't do Object.fromEntries etc because some exotic objects like GPUBuffer shouldn't be copied
    for (const key of Object.keys(proxied)) {
      proxied[key] = unproxify(proxied[key]);
    }
    return proxied;
  }
}

function getCallChain(proxied: unknown) {
  if (typeof proxied === "object" && proxied !== null) {
    return Tracking.getState(proxied)?.callChain;
  }
}

export function getContext(proxied: unknown) {
  return getCallChain(proxied)?.getContext();
}

function withContext(callChain: CallChain, context: unknown) {
  const rest = callChain.chain.slice(0, -1);
  const last = { ...callChain.chain.slice(-1)[0], context };
  return new CallChain([...rest, last], callChain.rootContext);
}
