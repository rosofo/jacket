import { z } from "zod/v4";
import { animate, createScope } from "animejs";
import {
  applyEdgeChanges,
  BaseEdge,
  getSimpleBezierPath,
  MarkerType,
  ReactFlowProvider,
  type EdgeProps,
} from "@xyflow/react";
import {
  GiCircuitry,
  GiDatabase,
  GiJumpAcross,
  GiPencilRuler,
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { pruneGraph, toGraph } from "./graph";
import { useShallow } from "zustand/react/shallow";
import { dropRightWhile, takeRightWhile } from "es-toolkit";
import { useHoverInfoStore } from "../hooks/hover-info";

const DefaultNode = React.memo((props: JacketProps) => {
  return <BaseNode {...props}>{props.data.label}</BaseNode>;
});

const StatusNode = React.memo((props: JacketProps<BaseData & StatusData>) => {
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
});

const BaseNode = ({
  children,
  data,
}: JacketProps & { children?: ReactNode }) => {
  const { setHover, clear } = useHoverInfoStore(
    useShallow(({ setHover, clear }) => ({ setHover, clear }))
  );
  return (
    <div
      className="box small relative"
      onMouseEnter={() => {
        if (data.hoverNode !== undefined) setHover(data.hoverNode);
      }}
      onMouseLeave={clear}
      style={{ cursor: "default" }}
    >
      {children}
      <Handle position={Position.Top} type="target" />
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
};

const NODE_TYPES = { basic: DefaultNode, status: StatusNode };
const EDGE_TYPES = { animated: AnimatedSVGEdge };

const selector = (state) => state.program;
export default function Overview() {
  return (
    <ReactFlowProvider>
      <OverviewBase />
    </ReactFlowProvider>
  );
}
function OverviewBase() {
  const program = useProgramStore(useShallow(selector));

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

function buildData(program: Program): [Node[], Edge[]] {
  const graph = toGraph(program);
  pruneGraph(graph);
  const nodes = Array.from(graph.nodeEntries()).map(({ node, attributes }) =>
    buildNode(node, attributes)
  );
  const edges: Edge[] = Array.from(graph.edgeEntries()).map((edge): Edge => {
    return {
      source: edge.source,
      target: edge.target,
      id: `${edge.source}-${edge.target}`,
      label:
        edge.attributes.type === "parent"
          ? dropRightWhile(
              edge.attributes.callChain.split("."),
              (part) => part === "()" || part.startsWith("__")
            ).slice(-1)[0]
          : "dependency",
      animated: edge.targetAttributes.ephemeral,
      markerEnd:
        edge.attributes.type === "dependency" ? MarkerType.Arrow : undefined,
      style:
        edge.attributes.type === "parent"
          ? { stroke: "var(--color-blue)" }
          : undefined,
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

type BaseData = { label: string; ephemeral?: boolean; hoverNode?: ReactNode };
type StatusData = { statuses: { node: ReactNode }[] };
type JacketProps<T extends Record<string, unknown> = BaseData> = NodeProps<
  Node<T>
>;

function buildNode(
  node: string,
  attributes: Omit<ProgramItem, "id" | "parentId" | "dependencies">
) {
  let type = "basic";
  const info = valueInfo(attributes.value);
  const data: BaseData & Record<string, unknown> = {
    label: "label" in info ? `${info.label} (${info.name})` : info.name,
    ephemeral: attributes.ephemeral,
    hoverNode: <pre>{JSON.stringify(attributes.value, null, 2)}</pre>,
  };
  if ("length" in info) {
    type = "status";
    data.statuses = [
      {
        node: (
          <div className="cluster small">
            <GiPencilRuler />
            {`length: ${info.length}`}
          </div>
        ),
      },
    ];
    if ("bytes" in info) {
      data.statuses.push(
        {
          node: (
            <div className="cluster small">
              <GiDatabase />
              {`bytes: ${info.bytes}`}
            </div>
          ),
        },
        {
          node: (
            <div className="cluster small">
              <GiJumpAcross />
              {`offset: ${info.offset}`}
            </div>
          ),
        }
      );
    }
  } else if (attributes.value instanceof GPUDevice) {
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

const ValueInfo = z.intersection(
  z.union([
    z
      .array(z.any())
      .transform((v) => ({ name: "array" as const, length: v.length })),
    z.instanceof(Float32Array).transform((v) => ({
      name: "Float32Array" as const,
      length: v.length,
      bytes: v.byteLength,
      offset: v.byteOffset,
    })),
    z
      .object({ name: z.string().nonempty() })
      .transform((v) => ({ name: v.name })),
    z
      .record(z.string(), z.union([z.number(), z.string()]))
      .transform((v) => ({ name: "object" as const, fields: v })),
  ]),
  z.object({ label: z.optional(z.string().nonempty()) })
);
type ValueInfo = z.infer<typeof ValueInfo> | { name: string };

function valueInfo(value: unknown): ValueInfo {
  try {
    const constructorName = value?.constructor?.name;
    return constructorName !== undefined &&
      !constructorName.match(/(Object|.*?Array(Buffer)?)/)
      ? { name: constructorName }
      : ValueInfo.parse(value);
  } catch {
    return { name: String(value) };
  }
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
