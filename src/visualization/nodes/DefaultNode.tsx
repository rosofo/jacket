import React from "react";
import { BaseNode } from "./BaseNode";
import type { JacketProps } from "./types";

export const DefaultNode = React.memo((props: JacketProps) => {
  return <BaseNode {...props}>{props.data.label}</BaseNode>;
});
