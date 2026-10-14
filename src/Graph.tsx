import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getStraightPath,
  Handle,
  Position,
  ReactFlow,
  type EdgeProps,
  type NodeProps,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { kindNames, person, type Edge } from "./model";

type PersonNode = Node<
  {
    name: string;
    role: string;
    color: string;
    self: boolean;
    expanded: boolean;
  },
  "person"
>;
function PersonView({ data, selected }: NodeProps<PersonNode>) {
  return (
    <div
      className={`person-node ${data.self ? "self" : ""} ${selected ? "is-selected" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ left: "50%", top: 42 }}
      />
      <div className="node-avatar" style={{ background: data.color }}>
        {data.name.slice(-2)}
        {data.self && <i>我</i>}
      </div>
      <div className="node-copy">
        <strong>{data.name}</strong>
        <span>{data.role}</span>
      </div>
      {!data.self && (
        <small
          className={`node-expand ${data.expanded ? "expanded" : ""}`}
          aria-hidden="true"
        >
          {data.expanded ? "✓" : "+"}
        </small>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ left: "50%", right: "auto", top: 42 }}
      />
    </div>
  );
}
const nodeTypes = { person: PersonView };
function ConnectionEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  style,
  id,
  data,
}: EdgeProps) {
  const [path, x, y] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const labelPosition = data?.labelPosition as
    | { x: number; y: number }
    | undefined;
  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      <EdgeLabelRenderer>
        <span
          className="connection-label"
          style={{
            transform: `translate(-50%,-50%) translate(${labelPosition?.x ?? x}px,${labelPosition?.y ?? y}px)`,
          }}
        >
          {label}
        </span>
      </EdgeLabelRenderer>
    </>
  );
}
const edgeTypes = { connection: ConnectionEdge };
export default function Graph({
  ids,
  edges,
  actor,
  expanded = [],
  onSelect,
  path = false,
  candidate = false,
}: {
  ids: string[];
  edges: Edge[];
  actor: string;
  expanded?: string[];
  onSelect?: (id: string) => void;
  path?: boolean;
  candidate?: boolean;
}) {
  const [instance, setInstance] =
    useState<ReactFlowInstance<PersonNode> | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const key = ids.join(",");
  const nodes = useMemo(
    () =>
      ids.map((id, index): PersonNode => {
        const p = person(id);
        const angle =
          ((index - 1) / Math.max(1, ids.length - 1)) * Math.PI * 2 -
          Math.PI / 2;
        const compactPositions = [
          { x: 105, y: 170 },
          { x: 105, y: 0 },
          { x: 0, y: 340 },
          { x: 210, y: 340 },
        ];
        const position = path
          ? width < 500
            ? { x: 105, y: index * 160 }
            : { x: index * 250, y: index % 2 ? 180 : 80 }
          : width < 500 && ids.length <= 4
            ? compactPositions[index]
            : index === 0
              ? { x: 390, y: 280 }
              : {
                  x: 390 + Math.cos(angle) * (width < 500 ? 215 : 275),
                  y: 280 + Math.sin(angle) * (width < 500 ? 185 : 200),
                };
        return {
          id,
          type: "person",
          position,
          data: {
            name: p.name,
            role: p.role,
            color: p.color,
            self: id === actor,
            expanded: expanded.includes(id),
          },
          ariaLabel: `${p.name}，${p.role}，点击展开关系`,
        };
      }),
    [key, actor, expanded.join(","), path, width],
  );
  useEffect(() => {
    const timer = setTimeout(
      () =>
        instance?.fitView({
          padding: width < 500 ? 0.08 : 0.15,
          duration: 250,
          maxZoom: 1.05,
        }),
      80,
    );
    return () => clearTimeout(timer);
  }, [key, instance, width]);
  const labelBoxes: { x: number; y: number; width: number; height: number }[] =
    [];
  const nodeBoxes = nodes.map((n) => ({
    ...n.position,
    width: 184,
    height: 84,
  }));
  const flowEdges = edges
    .filter((e) => ids.includes(e.a) && ids.includes(e.b))
    .map((e) => {
      const source = nodes.find((n) => n.id === e.a)!.position;
      const target = nodes.find((n) => n.id === e.b)!.position;
      const label = candidate
        ? "候选 · 未确认"
        : `${kindNames[e.kind]}${e.objective ? " · 客观" : ""}`;
      const dx = target.x - source.x,
        dy = target.y - source.y,
        length = Math.hypot(dx, dy) || 1;
      const labelWidth = label.length * 12 + 22;
      let labelPosition = {
        x: (source.x + target.x) / 2 + 92,
        y: (source.y + target.y) / 2 + 42,
      };
      // Keep relation badges clear of full person cards, including on narrow screens.
      for (const offset of [0, 28, -28, 48, -48, 72, -72]) {
        const point = {
          x: labelPosition.x - (dy / length) * offset,
          y: labelPosition.y + (dx / length) * offset,
        };
        const box = {
          x: point.x - labelWidth / 2,
          y: point.y - 14,
          width: labelWidth,
          height: 28,
        };
        const overlaps = [...nodeBoxes, ...labelBoxes].some(
          (b) =>
            box.x < b.x + b.width + 6 &&
            box.x + box.width > b.x - 6 &&
            box.y < b.y + b.height + 6 &&
            box.y + box.height > b.y - 6,
        );
        if (!overlaps) {
          labelPosition = point;
          break;
        }
      }
      labelBoxes.push({
        x: labelPosition.x - labelWidth / 2,
        y: labelPosition.y - 14,
        width: labelWidth,
        height: 28,
      });
      return {
        id: e.id,
        source: e.a,
        target: e.b,
        label,
        data: { labelPosition },
        type: "connection",
        animated: path,
        style: {
          stroke: candidate
            ? "#a9a0bd"
            : path
              ? "#7966eb"
              : e.objective
                ? "#6c8dda"
                : "#9880d9",
          strokeWidth: path ? 3 : 2,
          strokeDasharray: candidate ? "5 6" : undefined,
          opacity: e.fadedBy.some((id) => id === actor) ? 0.32 : 1,
        },
        labelStyle: { fill: "#726b8d", fontSize: 12 },
        labelBgStyle: { fill: "#faf9ff", fillOpacity: 0.95 },
      };
    });
  return (
    <div ref={container} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setInstance}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        fitView
        nodesConnectable={false}
        nodesDraggable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#dcd8ec" gap={24} size={1} />
        <Controls position="top-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
