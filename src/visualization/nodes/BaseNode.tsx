import { Handle, Position } from "@xyflow/react";
import React, { type ReactNode } from "react";
import { useShallow } from "zustand/shallow";
import { useHoverInfoStore } from "../../hooks/hover-info";
import type { JacketProps } from "./types";

export const BaseNode = ({
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
