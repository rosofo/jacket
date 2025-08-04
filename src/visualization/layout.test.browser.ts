import { describe, it } from "vitest";
import { arbDag } from "./layout.test-utils";
import * as fc from "fast-check";
import { LayoutSolver } from "./layout";

describe("LayoutSolver", () => {
  it("should never fail to solve", () => {
    fc.assert(
      fc.property(arbDag, (graph) => {
        const solver = new LayoutSolver();
        solver.addBoxes(graph.nodes);
        solver.addEdgeConstraints(graph.edges);
        solver.solve();
        1;
      })
    );
  });
});
