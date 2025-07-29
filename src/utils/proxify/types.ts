import type { CallChain } from "./call-chain";

export type ProxifyState = {
  rawValue: unknown;
  callChain: CallChain;
  valueCallbackResult: unknown;
};
