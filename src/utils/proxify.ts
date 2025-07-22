// Note: Will probs move to being a library at some point
// Note: Currently a WIP

import { deepCopy } from "walkjs";

export type BaseTypes =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

export type Proxified<T extends object, C extends object = object> = T &
  ProxifyInternal<T, C>;

export interface JsProxyProperties<
  T extends object,
  K extends keyof T,
  C extends object,
> {
  value: T[K];
  receiver: Proxified<T, C>;
  target: T;
}

export interface ProxifyInternal<T extends object, C extends object> {
  __proxify_internal: {
    rawValue: T;
    valueCallbackResult: unknown;
    context: C;
  };
}

const PROXIFY_INTERNAL_KEY = "__proxify_internal";

function proxifyValue<T extends object, K extends keyof T, C extends object>(
  { value, receiver, target }: JsProxyProperties<T, K, C>,
  currentCaller: CallChain,
  options: ProxifyOptions<C>
) {
  const prevContext =
    receiver[PROXIFY_INTERNAL_KEY]?.context || options.context;
  const valueCallbackReturn = options.valueCallback(
    currentCaller,
    prevContext,
    value
  );
  const normalisedValue =
    valueCallbackReturn === undefined ? value : valueCallbackReturn.value;

  const internalFields = {
    [PROXIFY_INTERNAL_KEY]: {
      rawValue: value,
      valueCallbackResult: valueCallbackReturn,
      context: valueCallbackReturn?.context || prevContext,
    },
  };

  if (normalisedValue instanceof Promise) {
    const promise = new Promise((resolve, reject) => {
      normalisedValue
        .then((resolvedValue) => {
          resolve(
            proxifyValue(
              { value: resolvedValue, receiver, target },
              currentCaller.extend("resolved"),
              options
            )
          );
        })
        .catch((rejectedValue) => {
          reject(
            proxifyValue(
              { value: rejectedValue, receiver, target },
              currentCaller.extend("rejected"),
              options
            )
          );
        });
    });
    return Object.assign(promise, internalFields);
  } else if (normalisedValue instanceof Function) {
    // Do not make this an arrow function, it wont work for *this* reasons :p
    const f = function (...actualArgs: unknown[]) {
      const t = this === receiver ? target : this;
      const actualFunction = (...args: unknown[]) =>
        normalisedValue.apply(t, args);
      currentCaller = currentCaller.extend("executed");
      const functionExeccallbackReturn = options.functionExecCallback(
        currentCaller,
        internalFields[PROXIFY_INTERNAL_KEY].context,
        actualArgs,
        actualFunction
      );
      if (functionExeccallbackReturn?.context !== undefined) {
        internalFields[PROXIFY_INTERNAL_KEY].context =
          functionExeccallbackReturn.context;
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
      return Object.assign(p, internalFields);
    };
    return Object.assign(f, internalFields);
  } else if (normalisedValue instanceof Object) {
    const p = new Proxy(normalisedValue, handler(currentCaller, options));
    return Object.assign(p, internalFields);
  }
  return normalisedValue;
}
function handler<C extends object>(
  caller: CallChain = new CallChain([]),
  options: ProxifyOptions<C>
) {
  return {
    get(
      target: Record<string, unknown>,
      property: string,
      receiver: Proxified<Record<string, unknown>, C>
    ): unknown {
      const value = target[property];
      if (property === PROXIFY_INTERNAL_KEY) return value;
      const currentCaller = caller.extend({
        name: property,
        type: typeof value,
      });
      return proxifyValue<Record<string, unknown>, string, C>(
        { value, receiver, target },
        currentCaller,
        options
      );
    },
  };
}

interface BaseCaller {
  name: string;
  type: BaseTypes;
}

export type Caller = BaseCaller | "executed" | "resolved" | "rejected";

export class CallChain {
  chain: Caller[];
  constructor(chain: Caller[]) {
    this.chain = chain;
  }
  extend(caller: Caller): CallChain {
    return new CallChain([...this.chain, caller]);
  }
  toCallChainString(): string {
    return this.chain.map((call) => `.${callerString(call)}`).join("");
  }
  toString(): string {
    return this.chain.toString();
  }
}
function callerString(caller: Caller) {
  switch (caller) {
    case "executed":
      return "()";
    case "resolved":
      return "__asyncResolved()";
    case "rejected":
      return "__asyncRejected()";
    default:
      return caller.name;
  }
}

export type ProxifyReturn<C extends object> = {
  value: unknown;
  context?: C;
} | void;

export interface ProxifyOptions<C extends object = object> {
  valueCallback: (
    caller: CallChain,
    context: C,
    rawValue: unknown
  ) => ProxifyReturn<C>;
  functionExecCallback: (
    caller: CallChain,
    context: C,
    args: unknown[],
    func: (...args: unknown[]) => unknown
  ) => ProxifyReturn<C>;
  context: C;
}

export function proxify<T extends object, C extends object = object>(
  target: T,
  proxyifyOptions: Partial<ProxifyOptions<C>> = {}
): T {
  const defaults: ProxifyOptions<C> = {
    valueCallback: () => {},
    functionExecCallback: () => {},
    context: proxyifyOptions?.context || ({} as C),
  };
  const options: ProxifyOptions<C> = { ...defaults, ...proxyifyOptions };
  target = Object.assign(target, {
    [PROXIFY_INTERNAL_KEY]: { context: proxyifyOptions.context },
  });
  return new Proxy(target, handler(new CallChain([]), options));
}

export function unproxify<T, C extends object = object>(
  proxied: T extends object ? Proxified<T, C> | Proxified<T, C>[] | T : T
): T {
  if (proxied === null || proxied === undefined || typeof proxied !== "object")
    return proxied as T;
  if (PROXIFY_INTERNAL_KEY in proxied) {
    const internals = proxied[PROXIFY_INTERNAL_KEY] as ProxifyInternal<T, C>;
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

export function getContext<T extends object, C extends object>(
  proxied: ProxifyInternal<T, C>
): C {
  return proxied.__proxify_internal.context;
}
