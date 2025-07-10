import { test, expect } from "vitest";
import { getContext, proxify } from "./proxify";
import * as fc from "fast-check";
import { walk } from "walkjs";

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

test("context inherits if not updated", () => {
  fc.assert(
    fc.property(fc.object({ maxDepth: 10 }), (value) => {
      const proxied = proxify(value, {
        context: { count: 0 },
        valueCallback: (caller, context, value) => {
          return { value, context: { count: context.count + 1 } };
        },
      });
      walk(proxied, {
        graphMode: "finiteTree",
        onVisit: {
          callback: (node) => {
            if (
              node.parent !== undefined &&
              node.val !== null &&
              typeof node.val === "object" &&
              !(node.val instanceof Array)
            ) {
              const currCtx = getContext(node.val);
              const prevCtx = getContext(node.parent?.val);
              expect(currCtx.count - prevCtx.count).toEqual(1);
            }
          },
        },
      });
    })
  );
});
