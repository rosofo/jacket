import * as g from "graphology";
import type { Program, ProgramItem } from "../hooks/program";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["jacket", "graph"]);

export type NodeWeight = ProgramItem;

export type EdgeWeight =
  | {
      type: "parent";
      callChain: string;
    }
  | {
      type: "dependency";
    };

export type Graph = g.DirectedGraph<NodeWeight, EdgeWeight>;

export function toGraph(program: Program): Graph {
  const graph: Graph = new g.DirectedGraph();
  logger.debug`Building graph from program`;
  let errors = 0;
  const tryCountErrors = (callback: () => void) => {
    try {
      callback();
    } catch {
      errors++;
    }
  };
  const logErrors = (name: string) => {
    if (errors > 0) logger.debug`Failed to add ${errors} ${name}`;
    errors = 0;
  };
  for (const item of program) {
    logger.trace`Add node: ${item}`;
    tryCountErrors(() => {
      graph.addNode(item.id, item);
    });
  }
  logErrors("nodes");
  for (const item of program) {
    if (item.parentId !== undefined)
      tryCountErrors(() => {
        graph.addDirectedEdge(item.parentId, item.id, {
          callChain: item.callChain || "",
          type: "parent",
        });
      });
  }
  logErrors("edges");
  for (const item of program) {
    if (item.dependencies !== undefined)
      for (const dep of item.dependencies) {
        tryCountErrors(() => {
          if (dep.untrackedValue !== undefined) {
            graph.addNode(dep.id, {
              value: dep.untrackedValue,
              id: dep.id,
              ephemeral: item.ephemeral,
            });
          }
          graph.addDirectedEdge(dep.id, item.id, {
            type: "dependency",
          });
        });
      }
  }
  logErrors("dependency nodes/edges");
  return graph;
}

export function pruneGraph(graph: Graph) {
  graph.forEachNode((node, attrs) => {
    if (shouldPrune(attrs.value)) {
      const inNodes = graph.inNeighbors(node);
      const outNodes = graph.outNeighbors(node);
      for (const inNode of inNodes) {
        for (const outNode of outNodes) {
          graph.addDirectedEdge(inNode, outNode);
        }
      }
      graph.dropNode(node);
    }
  });
}
function shouldPrune(value: unknown) {
  return (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "string" ||
    typeof value === "number"
  );
}
