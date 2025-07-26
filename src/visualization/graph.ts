import * as g from "graphology";
import type { Program, ProgramItem } from "../hooks/program";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["jacket", "graph"]);

type Graph = g.DirectedGraph<
  Omit<ProgramItem, "id" | "parentId" | "callChain">,
  { callChain: string }
>;

export function toGraph(program: Program): Graph {
  const graph: Graph = new g.DirectedGraph();
  logger.debug`Building graph from program`;
  for (const item of program) {
    logger.trace`Add node: ${item}`;
    graph.addNode(item.id, { value: item.value, ephemeral: item.ephemeral });
  }
  let errors = 0;
  for (const item of program) {
    if (item.parentId !== undefined)
      try {
        graph.addDirectedEdge(item.parentId, item.id, {
          callChain: item.callChain,
        });
      } catch {
        errors++;
      }
  }
  if (errors > 0) {
    logger.debug`Failed to add ${errors} edges`;
  }
  return graph;
}

export function pruneGraph(graph: Graph) {
  const entries = Array.from(graph.nodeEntries());
  for (const node of entries) {
    if (shouldPrune(node.attributes.value)) {
      const inNodes = graph.inNeighbors(node.node);
      const outNodes = graph.outNeighbors(node.node);
      for (const inNode of inNodes) {
        for (const outNode of outNodes) {
          graph.addDirectedEdge(inNode, outNode);
        }
      }
      graph.dropNode(node.node);
    }
  }
}
function shouldPrune(value: unknown) {
  return value === undefined || typeof value === "function";
}
