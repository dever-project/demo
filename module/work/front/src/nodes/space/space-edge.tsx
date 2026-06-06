import { Scissors } from "lucide-react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

type SpaceEdgeData = {
  isHighlighted?: boolean;
  isSelected?: boolean;
  highlightColor?: string;
  onDelete?: (edgeId: string) => void;
};

export function SpaceAnimatedEdge({
  id,
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const edgeData = (data || {}) as SpaceEdgeData;
  const isSelected = Boolean(edgeData.isSelected);
  const isHighlighted = Boolean(edgeData.isHighlighted || isSelected);
  const highlightColor = edgeData.highlightColor || "#0ea5e9";
  const stroke = isSelected ? "var(--ws-edge-selected)" : isHighlighted ? highlightColor : "rgba(148, 163, 184, 0.52)";
  const strokeWidth = isSelected ? 2.8 : isHighlighted ? 2.4 : 1.45;
  const opacity = isHighlighted ? 0.96 : 0.62;

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
      {isSelected ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="ws-edge-delete nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            aria-label="删除连线"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              edgeData.onDelete?.(String(id));
            }}
          >
            <Scissors size={15} />
          </button>
        </EdgeLabelRenderer>
      ) : null}
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
