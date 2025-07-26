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
type Caller =
  | {
      name: string;
      type: BaseTypes;
      value: unknown;
      context?: unknown;
    }
  | { type: "resolved" | "rejected" | "executed"; context?: unknown };

export class CallChain {
  rootContext?: unknown;
  chain: Caller[];
  ctx: Logger;
  constructor(chain: Caller[], rootContext: unknown) {
    this.chain = chain;
    this.rootContext = rootContext;

    this.ctx = logger.with({ rootContext, chain: this.toCallChainString() });
    this.ctx.trace("new CallChain {chain}");
  }
  extend(caller: Caller): CallChain {
    return new CallChain([...this.chain, caller], this.rootContext);
  }
  toCallChainString(): string {
    return this.chain.map((call) => `.${callerString(call)}`).join("");
  }
  toString(): string {
    return this.chain.toString();
  }
  /**
   * Get the inherited context, if any.
   * @returns the context as of the last update from any callbacks, or undefined
   */
  getContext(): unknown {
    const last = [...this.chain]
      .reverse()
      .find((caller) => caller.context !== undefined);
    const context = (last as { context: unknown })?.context;
    const result = context || this.rootContext;
    this.ctx.debug`Getting context: ${result}`;
    return result;
  }
}
function callerString(caller: Caller) {
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
