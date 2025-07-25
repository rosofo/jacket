import * as g from "graphology";
import type { Program, ProgramItem } from "../hooks/program";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["jacket", "graph"]);

export type Graph = g.DirectedGraph<Omit<ProgramItem, "id" | "parentId">>;

export function toGraph(program: Program): Graph {
  const graph: Graph = new g.DirectedGraph();
  logger.debug`Building graph from program`;
  for (const item of program) {
    logger.trace`Add node: ${item}`;
    graph.addNode(item.id, { value: item.value, ephemeral: item.ephemeral });
  }
  for (const item of program) {
    if (item.parentId !== undefined)
      try {
        graph.addDirectedEdge(item.parentId, item.id);
      } catch (e) {
        logger.error`Failed to add edge from ${item.id} to ${item.parentId}. Node type: ${typeof item.value}`;
      }
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
  return typeof value === "function";
}
