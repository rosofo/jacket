import {
  GiPencilRuler,
  GiDatabase,
  GiJumpAcross,
  GiCircuitry,
  GiPerspectiveDiceFour,
  GiTreasureMap,
} from "react-icons/gi";
import AbstractSvg from "../components/AbstractSvg";
import type { Program, ProgramItem } from "../hooks/program";
import { type ValueInfo, valueInfo } from "./data/values";
import type { BaseData, StatusData } from "./nodes/types";
import { pruneGraph, toGraph } from "./graph";
import { dropRightWhile } from "es-toolkit";
import { MarkerType, type Edge } from "@xyflow/react";
import type { ReactNode } from "react";

export function buildData(program: Program): [Node[], Edge[]] {
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

export function buildNode(
  node: string,
  attributes: Omit<ProgramItem, "id" | "parentId" | "dependencies">
) {
  let info: ValueInfo = { name: "object", fields: {} };
  if (typeof attributes.value === "object" && attributes.value !== null)
    info = valueInfo(attributes.value);
  const data: BaseData & Partial<StatusData> & Record<string, unknown> = {
    label: "label" in info ? `${info.label} (${info.name})` : info.name,
    ephemeral: attributes.ephemeral,
    hoverNode: <pre>{JSON.stringify(attributes.value, null, 2)}</pre>,
  };
  const statuses = buildStatuses(info, attributes);
  const type = statuses.length > 0 ? "status" : "basic";
  return {
    id: node,
    data: { ...data, statuses: type === "status" ? statuses : undefined },
    position: { x: 0, y: 0 },
    type: statuses.length > 0 ? "status" : "basic",
  };
}
function buildStatuses(
  info: ValueInfo,
  attributes: Omit<ProgramItem, "id" | "parentId" | "dependencies">
) {
  let statuses: StatusData["statuses"] = [];
  if ("size" in info) {
    statuses = [
      {
        icon: <GiPencilRuler />,
        label: `length: ${info.size}`,
      },
    ];
  }
  if ("length" in info) {
    statuses = [
      {
        icon: <GiPencilRuler />,
        label: `length: ${info.length}`,
      },
    ];
    if ("bytes" in info) {
      statuses.push(
        {
          icon: <GiDatabase />,
          label: `bytes: ${info.bytes}`,
        },
        {
          icon: <GiJumpAcross />,
          label: `offset: ${info.offset}`,
        }
      );
    }
  } else if (attributes.value instanceof GPUDevice) {
    statuses = [
      {
        icon: <GiCircuitry />,
        label: attributes.value.adapterInfo.architecture,
      },
    ];
  } else if (attributes.value instanceof GPUBuffer) {
    statuses = [
      {
        icon: <GiPerspectiveDiceFour />,
        label: attributes.value.size.toString(),
      },
      {
        icon: <GiTreasureMap />,
        label: attributes.value.mapState,
      },
    ];
  }
  const extraFields = Object.entries(info.fields);
  if (extraFields.length > 0) {
    statuses = [
      ...(statuses || []),
      ...extraFields
        .filter(([k, v]) => typeof v === "number" || v.length < 20)
        .map(([k, v]) => ({
          icon: <AbstractSvg from={k} />,
          label: `${k}: ${v}`,
        })),
    ];
  }
  return statuses;
}
