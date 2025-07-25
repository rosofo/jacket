import {
  Background,
  Handle,
  Position,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProgramStore, type Program } from "../hooks/program";
import Dagre from "@dagrejs/dagre";
import { useEffect, useMemo } from "react";
import { pruneGraph, toGraph } from "./graph";
import usePulsar from "../hooks/pulsar";

export default function Overview() {
  const program = useProgramStore((state) => state.program);
  const { fitView } = useReactFlow();

  const [nodes, edges] = useMemo(() => {
    const [nodes, edges] = buildData(program);
    const layouted = getLayoutedElements(nodes, edges, { direction: "TB" });

    return [[...layouted.nodes], [...layouted.edges]];
  }, [program]);
  useEffect(() => {
    fitView();
  }, [program, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={{ default: DefaultNode }}
      colorMode="dark"
    >
      <Background />
    </ReactFlow>
  );
}

function buildData(program: Program): [Node[], Edge[]] {
  const graph = toGraph(program);
  pruneGraph(graph);
  const nodes: JacketNode[] = Array.from(graph.nodeEntries()).map(
    ({ node, attributes }) => ({
      id: node,
      data: {
        label:
          attributes.value?.constructor?.name ||
          attributes.value?.toString() ||
          `${attributes.value}`,
        ephemeral: attributes.ephemeral,
      },
      position: { x: 0, y: 0 },
      type: "default",
    })
  );
  const edges: Edge[] = Array.from(graph.edgeEntries()).map((edge) => {
    return {
      source: edge.source,
      target: edge.target,
      id: `${edge.source}-${edge.target}`,
    };
  });
  return [nodes, edges];
}

const getLayoutedElements = (nodes, edges, options) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: node.measured?.width ?? 120,
      height: node.measured?.height ?? 50,
    })
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      const x = position.x - (node.measured?.width ?? 0) / 2;
      const y = position.y - (node.measured?.height ?? 0) / 2;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

type JacketNode = Node<{ label: string; ephemeral?: boolean }>;
function DefaultNode(props: NodeProps<JacketNode>) {
  const x = props.positionAbsoluteX;
  const y = props.positionAbsoluteY;
  const pos = useReactFlow().flowToScreenPosition({ x, y });
  const pulsar = usePulsar(pos.x, pos.y);
  return (
    <div className="box small">
      {props.data.label}
      <Handle position={Position.Top} type="target" />
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}
