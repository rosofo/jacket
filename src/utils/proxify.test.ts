import { test, expect } from "vitest";
import { getContext, proxify, unproxify } from "./proxify";
import * as fc from "fast-check";
import { Break, deepCopy, SetVisitationRegister, walk } from "walkjs";

test("context can be immutably updated from valueCallback", () => {
  const value = { a: { b: {} } };
  const proxied = proxify(value, {
    valueCallback: (caller, context, value) => {
      return { value, context: { count: context.count + 1 } };
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
      valueCallback: (caller, context, rawValue) => {
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
        valueCallback: (caller, context, rawValue) => {
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
  expect(getContext(p.f)).to.have.property("hi").equals("hello");
  expect(getContext(p.f())).to.have.property("hi").equals("hello");
  expect(getContext(p.f().a)).to.have.property("hi").equals("hello");
});

test("context can be modified on method calls", () => {
  const p = proxify(
    { f: () => ({ a: {} }) },
    {
      context: { i: 0 },
      functionExecCallback: (caller, context, args, func) => {
        return { value: func(...args), context: { i: context.i + 1 } };
      },
    }
  );
  expect(getContext(p)).to.have.property("i").equals(0);
  expect(getContext(p.f)).to.have.property("i").equals(0);
  expect(getContext(p.f())).to.have.property("i").equals(1);
  expect(getContext(p.f().a)).to.have.property("i").equals(1);
});
