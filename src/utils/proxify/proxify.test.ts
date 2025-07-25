import { test, expect } from "vitest";
import { getContext, proxify } from ".";
import * as fc from "fast-check";
import {
  configure,
  getAnsiColorFormatter,
  getConsoleSink,
  getJsonLinesFormatter,
} from "@logtape/logtape";

configure({
  loggers: [{ category: "proxify", sinks: ["console"], lowestLevel: "trace" }],
  sinks: { console: getConsoleSink() },
});

test("context can be immutably updated from valueCallback", () => {
  const value = { a: { b: {} } };
  const proxied = proxify(value, {
    valueCallback: (caller, value) => {
      const context = caller.getContext();
      return { context: { count: context.count + 1 } };
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
        return { context: context.i + 1, value: rawValue };
      },
    }
  );

  expect(getContext(p.a)).to.equal(1);
  expect(getContext(p.a)).to.equal(1);
});

test("context is passed to arbitrarily deep properties", () => {
  type Tree = { a: Tree } | {};
  const { tree: nested } = fc.letrec<{ tree: Tree; branch: Tree; leaf: {} }>(
    (tie) => ({
      tree: fc.oneof({ depthSize: "small" }, tie("branch"), tie("leaf")),
      branch: fc.record({ a: tie("tree") }, { requiredKeys: [] }),
      leaf: fc.constant({}),
    })
  );

  fc.assert(
    fc.property(nested, (nested) => {
      let proxied = proxify(nested, {
        context: { i: 0 },
        valueCallback: (caller, rawValue) => {
          const context = caller.getContext();
          if (context.i !== null)
            return { value: rawValue, context: { i: context.i + 1 } };
        },
      });

      let last = null;
      while (proxied !== undefined) {
        const i = getContext(proxied).i;

        if (last !== null) {
          expect(i).to.equal(last + 1);
        }

        last = i;
        proxied = proxied.a;
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
        return { value: func(...args), context: { i: context.i + 1 } };
      },
    }
  );
  expect(getContext(p)).to.have.property("i").equals(0);
  expect(getContext(p.f())).to.have.property("i").equals(1);
  expect(getContext(p.f().a)).to.have.property("i").equals(1);
});

test("context is passed through promises", async () => {
  const p = proxify(async () => ({}), {
    context: { i: 0 },
    valueCallback: (caller, value) => {
      const context = caller.getContext();
      return { context: { i: context.i + 1 } };
    },
  });

  expect(getContext(await p()))
    .to.have.property("i")
    .equals(2);
  expect(getContext(p)).to.have.property("i").equals(0);
});

test("value callback is called", () => {
  const chains: CallChain[] = [];
  const p = proxify(
    { a: () => () => {} },
    {
      valueCallback: (caller, rawValue) => {
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
