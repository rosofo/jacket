import {
  applyEdgeChanges,
  BaseEdge,
  getSimpleBezierPath,
  ReactFlowProvider,
  type EdgeProps,
} from "@xyflow/react";
import { Background, ReactFlow, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProgramStore } from "../hooks/program";
import { useCallback, useMemo } from "react";
import { getLayoutedElements } from "./layout";
import { DefaultNode } from "./nodes/DefaultNode";
import { StatusNode } from "./nodes/StatusNode";
import { buildData } from "./flow-graph";

const NODE_TYPES = { basic: DefaultNode, status: StatusNode };
const EDGE_TYPES = { animated: AnimatedSVGEdge };

export default function Overview() {
  return (
    <ReactFlowProvider>
      <OverviewBase />
    </ReactFlowProvider>
  );
}
function OverviewBase() {
  const program = useProgramStore((state) => state.program);

  const [nodes, edges] = useMemo(() => {
    const [nodes, edges] = buildData(program);
    const layouted = getLayoutedElements(nodes, edges, { direction: "TB" });

    return [[...layouted.nodes], [...layouted.edges]];
  }, [program]);

  const { setEdges } = useReactFlow();
  const onEdgesChange = useCallback(
    (changes) => {
      console.log(changes);
      setEdges((oldEdges) => applyEdgeChanges(changes, oldEdges));
    },
    [setEdges]
  );

  return (
    <ReactFlow
      nodesDraggable={false}
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      colorMode="dark"
      onEdgesChange={onEdgesChange}
    >
      <Background />
    </ReactFlow>
  );
}

function AnimatedSVGEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getSimpleBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <circle r="10" fill="#ff0073">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
