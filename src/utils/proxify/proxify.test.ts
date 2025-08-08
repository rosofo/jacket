import { test, expect, suite } from "vitest";
import { getContext, proxify } from ".";
import * as fc from "fast-check";
import { configure, getConsoleSink } from "@logtape/logtape";
import type { CallChain } from "./call-chain";

configure({
  loggers: [{ category: "proxify", sinks: ["console"], lowestLevel: "trace" }],
  sinks: { console: getConsoleSink() },
});

test("context can be immutably updated from valueCallback", () => {
  const value = { a: { b: {} } };
  const proxied = proxify(value, {
    valueCallback: (caller) => {
      const context = caller.getContext();
      return {
        context: {
          count:
            (
              context as {
                count: number;
                i: number;
              }
            ).count + 1,
        },
      };
    },
    context: { count: 0 },
  });
  const b = proxied.a.b; // explicitly access b first
  const a = proxied.a;
  expect(getContext(a)).to.have.property("count").equals(1);
  expect(getContext(b)).to.have.property("count").equals(2);
});

test("context exists on outermost proxified value", () => {
  expect(getContext(proxify({ a: 1 }, { context: { hi: "hello" } })))
    .to.have.property("hi")
    .equal("hello");
});
test("context setting via property access is idempotent ", () => {
  const p = proxify(
    { a: {} },
    {
      context: { i: 0 },
      valueCallback: (caller, rawValue) => {
        const context = caller.getContext();
        return {
          context: { i: (context as { i: number }).i + 1 },
          value: rawValue,
        };
      },
    }
  );

  expect((getContext(p.a) as { i: number }).i).to.equal(1);
  expect((getContext(p.a) as { i: number }).i).to.equal(1);
});

test("context is passed to arbitrarily deep properties", () => {
  type Tree = { a: Tree } | object;
  const { tree: nested } = fc.letrec<{
    tree: Tree;
    branch: Tree;
    leaf: object;
  }>((tie) => ({
    tree: fc.oneof({ depthSize: "medium" }, tie("branch"), tie("leaf")),
    branch: fc.record({ a: tie("tree") }, { requiredKeys: [] }),
    leaf: fc.constant({}),
  }));

  fc.assert(
    fc.property(nested, (nested) => {
      nested = structuredClone(nested);
      console.log("new run");
      let proxied = proxify(nested, {
        context: { i: 0 },
        valueCallback: (caller, rawValue) => {
          const context = caller.getContext();
          return {
            value: rawValue,
            context: { i: (context as { i: number }).i + 1 },
          };
        },
      });

      let last = null;
      while (proxied !== undefined) {
        const i = (getContext(proxied) as { i: number }).i;

        if (last !== null) {
          expect(i).to.equal(last + 1);
        }

        last = i;
        proxied = (proxied as { a: object }).a;
      }
    }),
    { verbose: true, includeErrorInReport: true }
  );
});

test("context is passed through method calls", () => {
  const p = proxify({ f: () => ({ a: {} }) }, { context: { hi: "hello" } });
  expect(getContext(p)).to.have.property("hi").equals("hello");
  expect(getContext(p.f())).to.have.property("hi").equals("hello");
  expect(getContext(p.f().a)).to.have.property("hi").equals("hello");
});

test("context can be modified on method calls", () => {
  const p = proxify(
    { f: () => ({ a: {} }) },
    {
      context: { i: 0 },
      functionExecCallback: (caller, args, func) => {
        const context = caller.getContext();
        return {
          value: func(...args),
          context: { i: (context as { i: number }).i + 1 },
        };
      },
    }
  );
  expect(getContext(p)).to.have.property("i").equals(0);
  expect(getContext(p.f())).to.have.property("i").equals(1);
  expect(getContext(p.f().a)).to.have.property("i").equals(1);
});

test("context is passed through promises", async () => {
  const p = proxify(
    { a: Promise.resolve({}) },
    {
      context: { i: 0 },
      valueCallback: (caller) => {
        const context = caller.getContext();
        return { context: { i: (context as { i: number }).i + 1 } };
      },
    }
  );

  expect(getContext(await p.a))
    .to.have.property("i")
    .equals(2);
  expect(getContext(p.a)).to.have.property("i").equals(1);
  expect(getContext(p)).to.have.property("i").equals(0);
});

test("value callback is called", () => {
  const chains: CallChain[] = [];
  const p = proxify(
    { a: () => () => {} },
    {
      valueCallback: (caller) => {
        chains.push(caller);
      },
    }
  );
  expect(chains).to.have.length(0);
  p.a()();
  expect(chains).to.have.length(3);
  expect(chains[0].toCallChainString()).to.equal(".a");
  expect(chains[1].toCallChainString()).to.equal(".a.()");
  expect(chains[2].toCallChainString()).to.equal(".a.().()");
});

test("constructor property is skipped", () => {
  const arr = proxify(new Float32Array([1, 2, 3]));
  // @ts-expect-error weird typing
  new arr.constructor();
});

suite("using matchers", () => {
  test("matched values are handled by their matcher callbacks", () => {
    const a = proxify(
      { a: 1, b: "hi" },
      {
        valueCallback: (callChain, rawValue) => {
          return { value: rawValue.toUpperCase() };
        },
        matchers: [
          {
            match: (v) => typeof v === "number",
            valueCallback: (callChain, rawValue) => {
              return { value: rawValue + 1 };
            },
          },
        ],
      }
    );
    expect(a.a).to.equal(2);
    expect(a.b).to.equal("HI");
  });
});
