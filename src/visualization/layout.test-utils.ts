import * as fc from "fast-check";
import { flatMap, flatten, map, pipe, uniq } from "rambda";

export const arbDag = fc
  .array(
    fc
      .tuple(
        fc.integer({ max: 99, min: 0 }),
        fc.integer({ max: 99, min: 0 }),
        fc.oneof(fc.constant("parent"), fc.constant("dependency"))
      )
      .filter(([a, b]) => a < b),
    { maxLength: 100, size: "large" }
  )
  .map((edges) => {
    const nodes = pipe(
      edges,
      map(([a, b]) => [a, b]),
      flatten<number>,
      uniq,
      map((x) => x.toString())
    );
    return {
      nodes,
      edges: edges.map(([source, target, type], i) => ({
        source: source.toString(),
        target: target.toString(),
        id: i.toString(),
        type: type as "parent" | "dependency",
      })),
    };
  });
