import type { NodeProps, Node } from "@xyflow/react";
import type { ReactNode } from "react";

export type JacketProps<T extends Record<string, unknown> = BaseData> =
  NodeProps<Node<T>>;

export type BaseData = {
  label: string;
  ephemeral?: boolean;
  hoverNode?: ReactNode;
};
export type StatusData = { statuses: { node: ReactNode }[] };
