import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

type SpaceEdgeData = {
  isHighlighted?: boolean;
  highlightColor?: string;
};

export function SpaceAnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const edgeData = (data || {}) as SpaceEdgeData;
  const isHighlighted = Boolean(edgeData.isHighlighted);
  const highlightColor = edgeData.highlightColor || "#0ea5e9";
  const stroke = isHighlighted ? highlightColor : "rgba(148, 163, 184, 0.52)";
  const strokeWidth = isHighlighted ? 2.4 : 1.45;
  const opacity = isHighlighted ? 0.95 : 0.62;

  return (
    <>
      {isHighlighted ? (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: highlightColor,
            strokeWidth: 7,
            opacity: 0.12,
          }}
        />
      ) : null}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth,
          opacity,
          transition: "stroke 160ms ease, stroke-width 160ms ease, opacity 160ms ease",
        }}
      />
      {isHighlighted ? (
        <>
          <circle r="3" fill={highlightColor}>
            <animateMotion dur="2.8s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="1.8" fill="rgba(255, 255, 255, 0.92)">
            <animateMotion dur="2.8s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      ) : null}
    </>
  );
}
