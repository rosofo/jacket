// Note: Will probs move to being a library at some point
// Note: Currently a WIP

import { CallChain } from "./call-chain";
import { Tracking } from "./track";
import type { ProxifyState } from "./types";

const DEFAULT_CALLBACKS = {
  valueCallback: () => {},
  functionExecCallback: () => {},
};

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
function proxifyValue<T extends object, K extends keyof T, C>(
  { value, receiver, target }: JsProxyProperties<T, K>,
  currentCaller: CallChain<C>,
  options: ProxifyOptions<C>,
  returnRaw?: boolean
) {
  const valueCallbackReturn = getMatchedCallbacks(value, options).valueCallback(
    currentCaller,
    value
  );
  const normalisedValue =
    valueCallbackReturn?.value === undefined
      ? value
      : valueCallbackReturn.value;
  if (valueCallbackReturn?.context !== undefined) {
    currentCaller = withContext(currentCaller, valueCallbackReturn.context);
  }
  returnRaw =
    valueCallbackReturn?.returnRaw ||
    shouldNotWrap(value, currentCaller) ||
    returnRaw;

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
      // @ts-expect-error we need this awful trickery according to [insert mdn page with example of Proxy forwarding]
      const t = this === receiver ? target : this;
      const actualFunction = (...args: unknown[]) => {
        const result = normalisedValue.apply(t, args);
        return result;
      };
      currentCaller = currentCaller.extend({ type: "executed" });
      const functionExeccallbackReturn = getMatchedCallbacks(
        normalisedValue,
        options
      ).functionExecCallback(currentCaller, actualArgs, actualFunction);
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
function handler<C>(caller: CallChain<C>, options: ProxifyOptions<C>) {
  return {
    get(
      target: Record<string, unknown>,
      property: string,
      receiver: Record<string, unknown>
    ): unknown {
      if (isUnhandleable(target, property, receiver)) {
        return target[property];
      }
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

export interface ProxifyCallbacks<C, T = unknown> {
  valueCallback: (caller: CallChain<C>, rawValue: T) => ProxifyReturn<C>;
  functionExecCallback: (
    caller: CallChain<C>,
    args: unknown[],
    func: (...args: unknown[]) => unknown
  ) => ProxifyReturn<C>;
}
export interface Matcher<C, T> extends Partial<ProxifyCallbacks<C, T>> {
  match(rawValue: unknown): rawValue is T;
}
export interface ProxifyOptions<C> extends ProxifyCallbacks<C> {
  matchers: Matcher<C, unknown>[];
  context: C;
}

export function proxify<T extends object, C>(
  target: T,
  proxyifyOptions: Partial<ProxifyOptions<C>> = {}
): T {
  const defaults: Omit<
    ProxifyOptions<C>,
    "context" | "matchers"
  > = DEFAULT_CALLBACKS;
  const options = { ...defaults, ...proxyifyOptions };
  const p = new Proxy(
    target,
    // @ts-expect-error honestly not sure how to fix this one ha
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
      // @ts-expect-error we can be *pretty* sure it's a string record at this point?
      proxied[key] = unproxify(proxied[key]);
    }
    return proxied;
  }
}

function getCallChain<C = unknown>(proxied: unknown): CallChain<C> | undefined {
  if (typeof proxied === "object" && proxied !== null) {
    return Tracking.getState(proxied)?.callChain;
  }
}

export function getContext<C = unknown>(proxied: unknown): C | undefined {
  return getCallChain<C>(proxied)?.getContext();
}

function withContext<C>(callChain: CallChain<C>, context: C) {
  const rest = callChain.chain.slice(0, -1);
  const last = { ...callChain.chain.slice(-1)[0], context };
  return new CallChain([...rest, last], callChain.rootContext);
}

function shouldNotWrap<C>(value: unknown, callChain: CallChain<C>) {
  return false;
}
function isUnhandleable(
  target: Record<string, unknown>,
  property: string,
  receiver: Record<string, unknown>
) {
  return property === "constructor";
}

function getMatchedCallbacks<C>(
  value: unknown,
  { functionExecCallback, valueCallback, matchers }: ProxifyOptions<C>
): ProxifyCallbacks<C> {
  for (const { match, ...callbacks } of matchers || []) {
    if (match(value)) {
      return { ...DEFAULT_CALLBACKS, ...callbacks };
    }
  }
  return { functionExecCallback, valueCallback };
}
