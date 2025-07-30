import {
  BaseEdge,
  getSimpleBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import {
  GiCircuitry,
  GiPerspectiveDiceFour,
  GiTreasureMap,
} from "react-icons/gi";
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
import {
  useProgramStore,
  type Program,
  type ProgramItem,
} from "../hooks/program";
import Dagre from "@dagrejs/dagre";
import { useEffect, useMemo, type ReactNode } from "react";
import { pruneGraph, toGraph } from "./graph";

const NODE_TYPES = { default: DefaultNode, status: StatusNode };
const EDGE_TYPES = { animated: AnimatedSVGEdge };

export default function Overview() {
  const program = useProgramStore((state) => state.program);

  const [nodes, edges] = useMemo(() => {
    const [nodes, edges] = buildData(program);
    const layouted = getLayoutedElements(nodes, edges, { direction: "TB" });

    return [[...layouted.nodes], [...layouted.edges]];
  }, [program]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      colorMode="dark"
    >
      <Background />
    </ReactFlow>
  );
}

function buildData(program: Program): [Node[], Edge[]] {
  const graph = toGraph(program);
  pruneGraph(graph);
  const nodes = Array.from(graph.nodeEntries()).map(({ node, attributes }) =>
    buildNode(node, attributes)
  );
  const edges: Edge[] = Array.from(graph.edgeEntries()).map((edge) => {
    return {
      source: edge.source,
      target: edge.target,
      id: `${edge.source}-${edge.target}`,
      label: edge.attributes.callChain,
      animated: edge.targetAttributes.ephemeral,
    };
  });
  return [nodes, edges];
}

const getLayoutedElements = (
  nodes: Node<Record<string, unknown>>[],
  edges: Edge[],
  options: { direction: string }
) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: node.measured?.width ?? 150,
      height: node.measured?.height ?? 75,
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

type BaseData = { label: string; ephemeral?: boolean };
type StatusData = { statuses: { node: ReactNode }[] };
type JacketProps<T extends Record<string, unknown> = BaseData> = NodeProps<
  Node<T>
>;

function buildNode(
  node: string,
  attributes: Omit<ProgramItem, "id" | "parentId" | "callChain">
) {
  let type = "default";
  const data: BaseData & Record<string, unknown> = {
    label:
      attributes.value?.constructor?.name ||
      attributes.value?.toString() ||
      `${attributes.value}`,
    ephemeral: attributes.ephemeral,
  };
  if (attributes.value instanceof GPUDevice) {
    type = "status";
    data.statuses = [
      {
        node: (
          <div className="cluster small ">
            <GiCircuitry />
            {attributes.value.adapterInfo.architecture}
          </div>
        ),
      },
    ];
  } else if (attributes.value instanceof GPUBuffer) {
    type = "status";
    data.statuses = [
      {
        node: (
          <div className="cluster small">
            <GiPerspectiveDiceFour />
            {attributes.value.size}
          </div>
        ),
      },
      {
        node: (
          <div className="cluster small">
            <GiTreasureMap />
            {attributes.value.mapState}
          </div>
        ),
      },
    ];
  }
  return {
    id: node,
    data,
    position: { x: 0, y: 0 },
    type,
  };
}

function DefaultNode(props: JacketProps) {
  return <BaseNode {...props}>{props.data.label}</BaseNode>;
}

function StatusNode(props: JacketProps<BaseData & StatusData>) {
  return (
    <div className="cluster">
      <BaseNode {...props}>
        {props.data.label}
        <div className="outside-right stack">
          {props.data.statuses.map((status, i) => (
            <div key={i} className="small">
              {status.node}
            </div>
          ))}
        </div>
      </BaseNode>
    </div>
  );
}

function BaseNode({ children }: JacketProps & { children?: ReactNode }) {
  return (
    <div className="box small relative">
      {children}
      <Handle position={Position.Top} type="target" />
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}

export function AnimatedSVGEdge({
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
