import { beforeEach, expect, suite, test } from "vitest";
import { expandDependencyEdges, toGraph, type Graph } from "./graph";

suite("expanding method calls", () => {
  let graph: Graph;
  beforeEach(() => {
    graph = toGraph([
      { id: "0", value: { label: "0" } },
      {
        id: "1",
        value: { label: "1" },
        parentId: "0",
        dependencies: [{ id: "2" }],
      },
      { id: "2", value: { label: "2" } },
    ]);
    expandDependencyEdges(graph);
  });
  test("nodes with at least one dependency gain a routing node", () => {
    expect(graph.nodes().length).to.equal(4);
  });
  test("routing nodes have one parent", () => {
    const routingNode = "route-1";
    expect(
      [...graph.inboundEdgeEntries(routingNode)].filter(
        ({ edge, attributes, source, target }) => attributes.type === "parent"
      )
    ).to.have.length(1);
  });
  test("routing nodes have one child", () => {
    const routingNode = "route-1";
    expect(
      [...graph.outboundEdgeEntries(routingNode)].filter(
        ({ edge, attributes, source, target }) => attributes.type === "parent"
      )
    ).to.have.length(1);
  });
  test("dependency edges retarget to routing nodes", () => {
    const routingNode = "route-1";
    expect(graph.outNeighbors("2")).to.have.length(1);
    expect(graph.outNeighbors("2")[0]).to.equal(routingNode);
  });
});
