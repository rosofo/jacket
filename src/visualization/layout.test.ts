import { describe, expect, it, test } from "vitest";
import { LayoutSolver } from "./layout";
import * as fc from "fast-check";
import { arbDag } from "./layout.test-utils";

describe("LayoutSolver", () => {
  it("should place children below parents (simple case)", () => {
    const solver = new LayoutSolver();
    const nodes = ["1", "2"];
    const edges = [
      { id: "a", source: "1", target: "2", type: "parent" },
    ] as Parameters<LayoutSolver["addEdgeConstraints"]>[0];
    solver.addBoxes(nodes);
    solver.addEdgeConstraints(edges);
    solver.solve();
    expect(solver.nodes["2"]).to.have.property("y").greaterThan(0);
  });
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
