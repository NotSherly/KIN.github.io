import { Component, Suspense, lazy, useState, type ReactNode } from "react";
import { Box, Focus, ListTree, Minus, RotateCcw } from "lucide-react";
import Graph from "./Graph";
import { kindNames, person, type Edge } from "./model";
import { DEMO_NODE_LIMIT, visiblePath } from "./graphLayout";

const Graph3D = lazy(() => import("./Graph3D"));

class GraphBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? (
      <div className="graph-fallback" role="status">
        <strong>此设备暂时无法打开 3D 视图</strong>
        <p>请切换上方的「2D 路径阅读」，继续探索已授权的关系。</p>
      </div>
    ) : this.props.children;
  }
}

export default function PersonalNetwork({
  ids, edges, actor, selected, expanded, candidate, onSelect, onCollapse, onReset,
}: {
  ids: string[];
  edges: Edge[];
  actor: string;
  selected: string;
  expanded: string[];
  candidate: boolean;
  onSelect: (id: string) => void;
  onCollapse: (id: string) => void;
  onReset: () => void;
}) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [cameraRequest, setCameraRequest] = useState({ action: "home", count: 0 });
  const shownIds = ids.slice(0, DEMO_NODE_LIMIT);
  const shownEdges = edges.filter((e) => shownIds.includes(e.a) && shownIds.includes(e.b));
  const route = candidate ? { ids: [], edges: [] } : visiblePath(shownIds, shownEdges, actor, selected);
  const readingPath = mode === "2d" && !candidate && selected !== actor && route.ids.length > 0;
  function camera(action: "home" | "fit") {
    setCameraRequest((previous) => ({ action, count: previous.count + 1 }));
    if (action === "home") onSelect(actor);
  }
  return (
    <>
      <div className="network-toolbar">
        <div className="view-switch" role="group" aria-label="关系图显示方式">
          <button aria-pressed={mode === "3d"} onClick={() => setMode("3d")}>
            <Box size={15} />3D 空间探索
          </button>
          <button aria-pressed={mode === "2d"} onClick={() => setMode("2d")}>
            <ListTree size={15} />2D 路径阅读
          </button>
        </div>
        <button className="network-action" onClick={() => camera("home")}>
          <Focus size={15} />回到自己
        </button>
      </div>
      <div className={`network-canvas ${mode === "3d" ? "spatial-canvas" : ""}`}>
        {mode === "3d" ? (
          <GraphBoundary key={actor}>
            <Suspense fallback={<div className="graph-fallback" role="status">正在准备 3D 关系空间…</div>}>
              <Graph3D
                ids={shownIds} edges={shownEdges} actor={actor} selected={selected}
                candidate={candidate} highlighted={route} onSelect={onSelect}
                cameraRequest={cameraRequest}
              />
            </Suspense>
          </GraphBoundary>
        ) : (
          <Graph
            ids={readingPath ? route.ids : shownIds}
            edges={readingPath ? route.edges : shownEdges}
            actor={actor} expanded={expanded} onSelect={onSelect}
            selected={selected} path={readingPath} candidate={candidate}
          />
        )}
        <div className="canvas-caption">
          <span className="spatial-status" />
          {candidate ? `${shownIds.length - 1} 位候选 · 不代表关系` : `${shownIds.length} 位可见人物 · 按授权逐层展开`}
        </div>
        {mode === "3d" && (
          <button className="network-fit" onClick={() => camera("fit")}>
            <Focus size={15} />查看全图
          </button>
        )}
        <div className="network-interaction-hint">
          {mode === "3d"
            ? "拖动旋转 · 滚轮缩放 · 右键拖动平移 / 双指缩放平移"
            : readingPath ? "当前显示选中人物的连接路径 · 点击「回到自己」查看网络" : "点击人物阅读路径 · 拖动平移 · 滚轮缩放"}
        </div>
      </div>
      <div className="network-exploration">
        <div className="exploration-heading">
          <span>{candidate ? "推荐人物 · 等待双方确认" : "点击人物，继续发现连接"}</span>
          <button className="network-action" onClick={() => { onReset(); camera("home"); }}><RotateCcw size={13} />收起到第一层</button>
        </div>
        <div className="network-people" aria-label="可见人物，支持键盘选择">
          {shownIds.map((id) => (
            <button key={id} aria-pressed={selected === id} onClick={() => onSelect(id)}>
              <i style={{ background: person(id).color }} />
              {person(id).name}{id === actor ? " · 我" : ""}
            </button>
          ))}
        </div>
        {!candidate && selected !== actor && (
          <div className="exploration-selection" aria-live="polite">
            <div>
              <strong>{route.edges.length === 1 ? "直接连接" : "可见连接路径 · 非直接确认"}</strong>
              <p>{route.ids.map((id, index) => `${index ? ` —${kindNames[route.edges[index - 1].kind]}→ ` : ""}${person(id).name}`).join("") || "当前没有可展示的授权路径"}</p>
            </div>
            {expanded.includes(selected) && (
              <button className="network-action" onClick={() => onCollapse(selected)}><Minus size={14} />收起此分支</button>
            )}
          </div>
        )}
        <p className="network-structure-note">{candidate ? "候选仅为虚构推荐，不参与路径推导，也不会自动建立关系。" : "空间位置表示连接层级，不表示情感亲密度。私人连接仅对关系参与者可见，不向外传递授权。"}</p>
        {ids.length > DEMO_NODE_LIMIT && <p className="network-structure-note">为保持流畅，本视图最多展示 {DEMO_NODE_LIMIT} 位人物。</p>}
      </div>
    </>
  );
}
