import { expect, suite, test } from "vitest";
import { genId } from "./id";

suite("genId", () => {
  test("is pure", () => {
    const data = "abcd";
    const parentId = "";

    let last = genId(data, parentId);
    for (let i = 0; i < 10; i++) {
      const id = genId(data, parentId);
      expect(id).to.equal(last);

      last = id;
    }
  });
});
