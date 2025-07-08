import { v4 as uuid } from "uuid";
import { test, expect } from "vitest";
import { proxify } from "./proxify";

test("ids", () => {
  class A {
    foo() {
      return { a: 1 };
    }
  }
  const a = new A();
  let result = {};
  const ids = {};
  const proxyA = proxify(a, {
    valueCallback: (caller, context, rawValue) => {
      const parent = context?.id;
      const parentIds = [...(context?.parentIds || []), parent];
      const id = uuid();
      ids[id] = rawValue;
      console.log(id, parentIds);
      return { value: rawValue, context: { id, parentIds } };
    },
    functionExecCallback: (caller, context, args, rawFunc) => {
      const parent = context?.id;
      const parentIds = [...(context?.parentIds || []), parent];
      const id = uuid();
      console.log("call", id, parentIds);
      result = context;
      ids[id] = rawFunc;
      return { value: rawFunc(...args), context: { id, parentIds } };
    },
  });
  proxyA.foo().a;

  console.log(ids);
  expect(result).to.have.keys(["id", "parentIds"]);
});
