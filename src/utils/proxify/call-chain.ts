import { getLogger, type Logger } from "@logtape/logtape";

const logger = getLogger(["proxify", "call-chain"]);

type BaseTypes =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";
type Caller<C> =
  | {
      name: string | symbol;
      type: BaseTypes;
      value: unknown;
      context?: C;
    }
  | { type: "resolved" | "rejected" | "executed"; context?: C };

export class CallChain<C> {
  rootContext: C;
  chain: Caller<C>[];
  ctx: Logger;
  constructor(chain: Caller<C>[], rootContext: C) {
    this.chain = chain;
    this.rootContext = rootContext;

    this.ctx = logger.with({ rootContext, chain: this.toCallChainString() });
    this.ctx.trace("new CallChain {chain}");
  }
  extend(caller: Caller<C>): CallChain<C> {
    return new CallChain([...this.chain, caller], this.rootContext);
  }
  toCallChainString(): string {
    return this.chain.map((call) => `.${String(callerString(call))}`).join("");
  }
  toString(): string {
    return this.chain.toString();
  }
  /**
   * Get the inherited context, if any.
   * @returns the context as of the last update from any callbacks, or undefined
   */
  getContext(): C {
    const last = [...this.chain]
      .reverse()
      .find((caller) => caller.context !== undefined);
    const context = (last as { context: C })?.context;
    const result = context || this.rootContext;
    this.ctx.debug`Getting context: ${result}`;
    return result;
  }
}
function callerString(caller: Caller<unknown>) {
  switch (caller.type) {
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
