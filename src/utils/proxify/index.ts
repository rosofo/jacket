// Note: Will probs move to being a library at some point
// Note: Currently a WIP

import { CallChain } from "./call-chain";

type BaseTypes =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

type Proxified<T extends object> = T & ProxifyInternal<T>;

interface JsProxyProperties<T extends object, K extends keyof T> {
  value: T[K];
  receiver: Proxified<T>;
  target: T;
}

interface ProxifyInternal<T extends object> {
  __proxify_internal: {
    rawValue: T;
    valueCallbackResult: unknown;
    callChain: CallChain;
  };
}

const PROXIFY_INTERNAL_KEY = "__proxify_internal";
// TODO proxify that too
/**
 * - target: the object being accessed, e.g. target['property'] or target.property
 * - receiver: the value of `this` for the current getter
 */
function proxifyValue<T extends object, K extends keyof T, C extends object>(
  { value, receiver, target }: JsProxyProperties<T, K>,
  currentCaller: CallChain,
  options: ProxifyOptions<C>
) {
  const valueCallbackReturn = options.valueCallback(currentCaller, value);
  const normalisedValue =
    valueCallbackReturn?.value === undefined
      ? value
      : valueCallbackReturn.value;
  if (valueCallbackReturn?.context !== undefined) {
    currentCaller = withContext(currentCaller, valueCallbackReturn.context);
  }

  const internalFields: ProxifyInternal<T> = {
    [PROXIFY_INTERNAL_KEY]: {
      // @ts-ignore
      rawValue: normalisedValue,
      valueCallbackResult: valueCallbackReturn,
      callChain: currentCaller,
    },
  };

  if (normalisedValue instanceof Promise) {
    const promise = new Promise((resolve, reject) => {
      normalisedValue
        .then((resolvedValue) => {
          resolve(
            proxifyValue(
              { value: resolvedValue, receiver, target },
              currentCaller.extend({ type: "resolved" }),
              options
            )
          );
        })
        .catch((rejectedValue) => {
          reject(
            proxifyValue(
              { value: rejectedValue, receiver, target },
              currentCaller.extend({ type: "rejected" }),
              options
            )
          );
        });
    });
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
        options
      );
      return p;
    };
    return Object.assign(f, internalFields);
  } else if (normalisedValue instanceof Object) {
    const p = new Proxy(normalisedValue, handler(currentCaller, options));
    return Object.assign(p, internalFields);
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
      receiver: Proxified<Record<string, unknown>>
    ): unknown {
      const value = target[property];
      if (property === PROXIFY_INTERNAL_KEY) return value;
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
  return Object.assign(p, {
    [PROXIFY_INTERNAL_KEY]: { callChain: new CallChain([], options.context) },
  });
}

export function unproxify<T extends object>(
  proxied: Proxified<T> | Proxified<T>[] | T
): T {
  if (proxied === null || proxied === undefined || typeof proxied !== "object")
    return proxied as T;
  if (PROXIFY_INTERNAL_KEY in proxied) {
    const internals = proxied[
      PROXIFY_INTERNAL_KEY
    ] as ProxifyInternal<T>["__proxify_internal"];
    return internals.rawValue;
  }
  if (proxied instanceof Array) {
    return proxied.map(unproxify) as T;
  } else {
    return Object.fromEntries(
      Object.entries(proxied).map(([key, val]) => [key, unproxify(val)])
    ) as T;
  }
}

function getCallChain(proxied: unknown) {
  if (
    typeof proxied === "object" &&
    proxied !== null &&
    PROXIFY_INTERNAL_KEY in proxied
  ) {
    return (proxied as ProxifyInternal<object>).__proxify_internal.callChain;
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
