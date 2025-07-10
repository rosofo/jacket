import {
  Background,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  useProgramStore,
  type Program,
  type ProgramItem,
} from "../hooks/program";
import { Type, type Static } from "@sinclair/typebox";
import { find, groupBy, includes, indexBy, map, pipe } from "rambda";
import Dagre from "@dagrejs/dagre";
import { useEffect, useMemo } from "react";

export default function Overview() {
  const program = useProgramStore((state) => state.program);
  const { fitView } = useReactFlow();

  const [nodes, edges] = useMemo(() => {
    const [nodes, edges] = buildData(program);
    console.log(nodes);
    const layouted = getLayoutedElements(nodes, edges, { direction: "TB" });

    return [[...layouted.nodes], [...layouted.edges]];
  }, [program]);
  useEffect(() => {
    fitView();
  }, [program, fitView]);
  return (
    <ReactFlow
      panOnDrag={false}
      zoomOnScroll={false}
      nodes={nodes}
      edges={edges}
      colorMode="dark"
    >
      <Background />
    </ReactFlow>
  );
}

const AttributesSchema = Type.Recursive((This) =>
  Type.Record(
    Type.String(),
    Type.Union([
      This,
      Type.String(),
      Type.Number(),
      Type.Array(Type.Union([Type.String(), Type.Number(), This])),
    ])
  )
);
type AttributesSchema = Static<typeof AttributesSchema>;

function buildData(program: Program): [Node[], Edge[]] {
  const idMap = pipe(program, indexBy("id"));
  const nodes: Node[] = program.map((node) => ({
    id: node.id,
    data: { label: node.type },
    position: { x: 0, y: 0 },
  }));
  const edges: Edge[] = program
    .filter(
      (node) =>
        node.parentId !== undefined && idMap[node.parentId] !== undefined
    )
    .map((node) => {
      const parent = idMap[node.parentId!];
      return {
        source: parent.id,
        target: node.id,
        id: `${parent.id}-${node.id}`,
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

function attributesOf(value: Program[0]) {
  return Value.Parse(AttributesSchema, value);
}

function toUsages(value: number): (keyof GPUBufferUsage)[] {
  const usages: (keyof GPUBufferUsage)[] = [];
  for (const usage in GPUBufferUsage) {
    const cmp = value & GPUBufferUsage[usage as keyof GPUBufferUsage];
    if (cmp > 0) {
      usages.push(usage as keyof GPUBufferUsage);
    }
  }
  return usages;
}
