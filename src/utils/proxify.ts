// Note: Will probs move to being a library at some point
// Note: Currently a WIP

export type BaseTypes =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

export interface JsProxyProperties {
  value: any;
  receiver: any;
  target: any;
}

export interface ProxifyInternal {
  rawValue: any;
  valueCallbackResult: any;
}

const PROXIFY_INTERNAL_KEY = "__proxify_internal";

function proxifyValue(
  { value, receiver, target }: JsProxyProperties,
  currentCaller: CallChain,
  options: ProxifyOptions
): any {
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
    let promise = new Promise((resolve, reject) => {
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
    const f = function (...actualArgs: any[]) {
      const t = this === receiver ? target : this;
      const actualFunction = (...args: any[]) => normalisedValue.apply(t, args);
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
      return proxifyValue(
        { value: result, receiver, target },
        currentCaller,
        options
      );
    };
    return Object.assign(f, internalFields);
  } else if (normalisedValue instanceof Object) {
    const p = new Proxy(normalisedValue, handler(currentCaller, options));
    return Object.assign(p, internalFields);
  }
  return normalisedValue;
}
function handler(
  caller: CallChain = new CallChain([]),
  options: ProxifyOptions
) {
  return {
    get(target: any, property: string, receiver: any): any {
      let value = target[property];
      if (property === PROXIFY_INTERNAL_KEY) return value;
      let currentCaller = caller.extend({ name: property, type: typeof value });
      return proxifyValue({ value, receiver, target }, currentCaller, options);
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

export type ProxifyReturn = { value: any; context?: any } | void;

export interface ProxifyOptions {
  valueCallback: (
    caller: CallChain,
    context: any,
    rawValue: any
  ) => ProxifyReturn;
  functionExecCallback: (
    caller: CallChain,
    context: any,
    args: any[],
    func: (...args: any[]) => any
  ) => ProxifyReturn;
  context: any;
}

export function proxify<T extends object>(
  target: T,
  proxyifyOptions: Partial<ProxifyOptions> = {}
): T {
  const defaults: ProxifyOptions = {
    valueCallback: () => {},
    functionExecCallback: () => {},
  };
  const options = { ...defaults, ...proxyifyOptions };
  return new Proxy(target, handler(new CallChain([]), options));
}

export function unproxify<T extends object>(proxied: T): T {
  if (typeof proxied !== "object") return proxied;
  if (PROXIFY_INTERNAL_KEY in proxied) {
    const internals = proxied[PROXIFY_INTERNAL_KEY] as ProxifyInternal;
    return internals.rawValue;
  } else if (proxied instanceof Array) {
    return proxied.map(unproxify) as T;
  } else {
    return Object.fromEntries(
      Object.entries(proxied).map(([key, val]) => [key, unproxify(val)])
    ) as T;
  }
}
