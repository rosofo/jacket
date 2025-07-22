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

test("context is passed to properties", () => {
  type Tree = { a: Tree; b: Tree } | {};
  const { tree } = fc.letrec<{ tree: Tree; branch: Tree; leaf: {} }>((tie) => ({
    tree: fc.oneof({ depthSize: "small" }, tie("branch"), tie("leaf")),
    branch: fc.record({ a: tie("tree"), b: tie("tree") }, { requiredKeys: [] }),
    leaf: fc.constant({}),
  }));

  fc.assert(
    fc.property(tree, (tree) => {
      const proxied = proxify(tree, {
        context: { i: 0 },
        valueCallback: (caller, context, rawValue) => {
          return { value: rawValue, context: { i: context.i + 1 } };
        },
      });

      let stack = [[null, proxied] as const];
      while (stack.length > 0) {
        const [prevI, node] = stack.pop();
        if (node === undefined) continue;
        const i = getContext(node).i;
        if (prevI !== null) {
          expect(i).to.equal(prevI + 1);
        }
        if (node.a !== undefined) stack.push([i, node.a]);
        if (node.b !== undefined) stack.push([i, node.b]);
      }
    }),
    { verbose: true, includeErrorInReport: true }
  );
});
