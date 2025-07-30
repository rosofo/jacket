import { expect, suite, test } from "vitest";
import { compileModule, createProxifyOpts } from "./program";
import { proxify } from "../utils/proxify";

suite("tracking module execution", () => {
  test("value ids are stable across module execution", async () => {
    const ids = [] as string[];

    const value = proxify(
      { a: 1 },
      createProxifyOpts((value, { id, parentId }) => {
        ids.push(id);
      })
    );

    const js = `export function main(value) {console.log(value.a);}`;
    const module = await compileModule(js);

    module.main(value);
    const idsA = [...ids];
    ids.splice(0);

    module.main(value);

    expect(idsA).toEqual(ids);
  });
});
