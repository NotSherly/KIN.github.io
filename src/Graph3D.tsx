import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-3d";
import { BufferGeometry, Group, Line, LineBasicMaterial, LineDashedMaterial, Mesh, MeshBasicMaterial, SphereGeometry, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SpriteText from "three-spritetext";
import { kindNames, person, shared, type Edge } from "./model";
import { layoutGraph, type LayoutNode } from "./graphLayout";

type SpatialNode = LayoutNode & { born: number; fx: number; fy: number; fz: number };
type SpatialLink = { id: string; source: string | NodeObject<SpatialNode>; target: string | NodeObject<SpatialNode>; edge: Edge; born: number };

export default function Graph3D({ ids, edges, actor, selected, candidate, highlighted, onSelect, cameraRequest }: {
  ids: string[];
  edges: Edge[];
  actor: string;
  selected: string;
  candidate: boolean;
  highlighted: { ids: string[]; edges: Edge[] };
  onSelect: (id: string) => void;
  cameraRequest: { action: string; count: number };
}) {
  const graph = useRef<ForceGraphMethods<SpatialNode, SpatialLink> | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [contextLost, setContextLost] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const previous = useRef<{ actor: string; nodes: Map<string, SpatialNode>; links: Map<string, SpatialLink> }>({ actor, nodes: new Map(), links: new Map() });
  const objects = useRef(new Map<string, Group>());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animationRunning = useRef(true);
  const graphKey = JSON.stringify([actor, ids, edges]);
  const data = useMemo(() => {
    const old = previous.current.actor === actor ? previous.current : { nodes: new Map<string, SpatialNode>(), links: new Map<string, SpatialLink>() };
    const now = performance.now();
    const nodes = layoutGraph(ids, edges, actor).map((node): SpatialNode => ({
      ...node, born: old.nodes.get(node.id)?.born ?? now,
      fx: node.x, fy: node.y, fz: node.z,
    }));
    const visible = new Set(nodes.map((node) => node.id));
    const links = edges.filter((edge) => visible.has(edge.a) && visible.has(edge.b)).map((edge): SpatialLink => ({
      id: edge.id, source: edge.a, target: edge.b,
      // The rendering library mutates its input. Copy business data at this boundary.
      edge: { ...edge, share: { ...edge.share }, fadedBy: [...edge.fadedBy] },
      born: old.links.get(edge.id)?.born ?? now,
    }));
    previous.current = { actor, nodes: new Map(nodes.map((node) => [node.id, node])), links: new Map(links.map((link) => [link.id, link])) };
    return { nodes, links };
  }, [graphKey]);
  const highlightKey = highlighted.ids.join(",") + ":" + highlighted.edges.map((edge) => edge.id).join(",");
  const hasSelection = selected !== actor;

  const updateLabels = useCallback(() => {
    if (!graph.current || !size.height) return;
    const camera = graph.current.camera() as PerspectiveCamera;
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const projected = data.nodes.map((node) => {
      const point = new Vector3(node.x, node.y, node.z).project(camera);
      return { id: node.id, x: (point.x + 1) * size.width / 2, y: (1 - point.y) * size.height / 2 };
    });
    const boxes = projected.map((point) => ({ x: point.x - 10, y: point.y - 10, width: 20, height: 20 }));
    // Place screen-facing labels around projected nodes, prioritizing the selection.
    const ordered = [...data.nodes].sort((a, b) => Number(b.id === selected) - Number(a.id === selected));
    for (const node of ordered) {
      const object = objects.current.get(node.id);
      const label = object?.getObjectByName("person-label") as SpriteText | undefined;
      if (!label) continue;
      const distance = camera.position.distanceTo(new Vector3(node.x, node.y, node.z));
      const worldPerPixel = distance * 2 * Math.tan(camera.fov * Math.PI / 360) / size.height;
      const orbScale = Math.max(1, worldPerPixel * (node.id === actor ? 9 : 6) / (node.id === actor ? 11 : 8));
      object!.getObjectByName("person-orb")?.scale.setScalar(orbScale);
      object!.getObjectByName("selection-halo")?.scale.setScalar(orbScale);
      const ratio = worldPerPixel * 15 / 11;
      label.scale.set(label.userData.width * ratio, label.userData.height * ratio, 1);
      const point = projected.find((point) => point.id === node.id)!;
      label.visible = point.x >= 0 && point.x <= size.width && point.y >= 0 && point.y <= size.height;
      const guide = object!.getObjectByName("label-guide") as Line;
      guide.visible = false;
      if (!label.visible) continue;
      const width = label.scale.x / worldPerPixel;
      const height = label.scale.y / worldPerPixel;
      const clampX = (x: number) => Math.max(width / 2 + 6 - point.x, Math.min(x, size.width - width / 2 - 6 - point.x));
      const clampY = (y: number) => Math.max(height / 2 + 45 - point.y, Math.min(y, size.height - height / 2 - 38 - point.y));
      let offset = { x: clampX(0), y: clampY(25) };
      const candidates = [[0, 25], [0, -25], [0, 46], [0, -46]];
      for (const radius of [46, 66, 86, 106]) {
        for (let step = 0; step < 8; step++) {
          const angle = step * Math.PI / 4;
          candidates.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
        }
      }
      let bestOverlap = Infinity;
      for (const [dx, dy] of candidates) {
        const x = clampX(dx), y = clampY(dy);
        const box = { x: point.x + x - width / 2, y: point.y + y - height / 2, width, height };
        const overlap = boxes.reduce((total, other) => total
          + Math.max(0, Math.min(box.x + box.width, other.x + other.width + 5) - Math.max(box.x, other.x - 5))
          * Math.max(0, Math.min(box.y + box.height, other.y + other.height + 5) - Math.max(box.y, other.y - 5)), 0);
        if (overlap < bestOverlap) {
          bestOverlap = overlap;
          offset = { x, y };
        }
        if (overlap === 0) break;
      }
      boxes.push({ x: point.x + offset.x - width / 2, y: point.y + offset.y - height / 2, width, height });
      label.position.copy(right).multiplyScalar(offset.x * worldPerPixel).addScaledVector(up, -offset.y * worldPerPixel);
      guide.visible = offset.x !== 0 || offset.y !== 25;
      const positions = guide.geometry.getAttribute("position");
      positions.setXYZ(1, label.position.x, label.position.y, label.position.z);
      positions.needsUpdate = true;
      guide.geometry.computeBoundingSphere();
    }
  }, [data, size.width, size.height, selected]);

  const wake = useCallback(() => {
    // resumeAnimation renders synchronously; a controls change can re-enter here.
    if (!animationRunning.current && graph.current) {
      animationRunning.current = true;
      graph.current.resumeAnimation();
    }
    updateLabels();
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      animationRunning.current = false;
      graph.current?.pauseAnimation();
    }, 1100);
  }, [updateLabels]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const ready = size.width > 0 && size.height > 0;
  useEffect(() => {
    if (!ready || !graph.current) return;
    const instance = graph.current;
    const renderer = instance.renderer();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const controls = instance.controls() as OrbitControls;
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.minDistance = 160;
    controls.maxDistance = 1800;
    controls.addEventListener("change", wake);
    const lost = (event: Event) => { event.preventDefault(); setContextLost(true); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    wake();
    return () => {
      clearTimeout(idleTimer.current);
      controls.removeEventListener("change", wake);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
    };
  }, [ready, wake]);

  useEffect(() => {
    if (!ready || !graph.current) return;
    wake();
    const instance = graph.current;
    const node = data.nodes.find((node) => node.id === selected) ?? data.nodes[0];
    if (selected === actor) {
      instance.cameraPosition({ x: 0, y: 30, z: Math.max(440, 300 * size.height / size.width) }, { x: 0, y: 0, z: 0 }, reducedMotion ? 0 : 650);
    } else {
      const controls = instance.controls() as OrbitControls;
      const direction = instance.camera().position.clone().sub(controls.target).normalize();
      const position = new Vector3(node.x, node.y, node.z).addScaledVector(direction, size.width < 500 ? 460 : 340);
      instance.cameraPosition(position, { x: node.x, y: node.y, z: node.z }, reducedMotion ? 0 : 650);
    }
    // Expansion must not reset the camera: only a new selection or explicit request does.
  }, [selected, actor, ready, cameraRequest.count, reducedMotion]);
  useEffect(() => {
    if (!ready || !graph.current) return;
    wake();
    if (cameraRequest.action === "fit") graph.current.zoomToFit(reducedMotion ? 0 : 650, 65);
  }, [cameraRequest.count]);
  useEffect(() => {
    if (!ready) return;
    wake();
    graph.current?.d3ReheatSimulation();
  }, [data, ready, size.width, size.height, wake]);

  const nodeObject = useCallback((node: NodeObject<SpatialNode>) => {
    const p = person(node.id);
    const active = !hasSelection || highlighted.ids.includes(node.id) || selected === node.id;
    const group = new Group();
    const radius = node.id === actor ? 11 : 8;
    const orb = new Mesh(new SphereGeometry(radius, 20, 14), new MeshBasicMaterial({ color: active ? p.color : "#d0d5e5", transparent: true, opacity: active ? 1 : 0.65 }));
    orb.name = "person-orb";
    group.add(orb);
    if (node.id === selected) {
      const halo = new Mesh(new SphereGeometry(radius * 1.5, 20, 14), new MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.12, depthWrite: false }));
      halo.name = "selection-halo";
      group.add(halo);
    }
    const name = new SpriteText(`${p.name}${node.id === actor ? " · 我" : ""}`, 11, active ? "#343a56" : "#6f7893");
    name.name = "person-label";
    name.fontFace = '"Microsoft YaHei", "PingFang SC", sans-serif';
    name.fontSize = 72;
    name.fontWeight = "600";
    name.backgroundColor = "#fbfcff";
    name.padding = [5, 3];
    name.borderRadius = 5;
    name.position.y = -radius - 14;
    name.material.depthTest = false;
    name.material.depthWrite = false;
    name.renderOrder = node.id === selected ? 12 : 10;
    name.userData = { width: name.scale.x, height: name.scale.y };
    group.add(name);
    const guide = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]), new LineBasicMaterial({ color: "#b7bfd0", transparent: true, opacity: 0.45 }));
    guide.name = "label-guide";
    guide.visible = false;
    group.add(guide);
    group.scale.setScalar(reducedMotion ? 1 : Math.max(0.05, Math.min(1, (performance.now() - node.born) / 360)));
    objects.current.set(node.id, group);
    return group;
  }, [actor, selected, highlightKey, reducedMotion]);

  const linkObject = useCallback((link: SpatialLink) => {
    const active = !hasSelection || highlighted.edges.some((edge) => edge.id === link.id);
    const faded = link.edge.fadedBy.some((id) => id === actor);
    const options = {
      color: active ? (link.edge.objective ? "#7398c9" : "#8272c2") : "#cdd4e3",
      transparent: true, opacity: (active ? 0.85 : 0.3) * (faded ? 0.32 : 1),
    };
    const material = candidate || !shared(link.edge)
      ? new LineDashedMaterial({ ...options, dashSize: candidate ? 4 : 2, gapSize: 3 })
      : new LineBasicMaterial(options);
    return new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]), material);
  }, [actor, selected, highlightKey, candidate]);

  return (
    <div ref={container} className="graph3d-surface" aria-label="3D 授权关系网，可使用下方人物按钮探索" onPointerMove={wake} onPointerDown={wake} onWheel={wake}>
      {contextLost ? <div className="graph-fallback" role="status">3D 显示已中断，请切换「2D 路径阅读」继续体验。</div> : ready && (
        <ForceGraph3D<SpatialNode, SpatialLink>
          ref={graph} graphData={data} width={size.width} height={size.height}
          controlType="orbit" rendererConfig={{ antialias: true, alpha: false, powerPreference: "low-power" }}
          backgroundColor="#f8faff" showNavInfo={false} enableNodeDrag={false}
          nodeThreeObject={nodeObject} nodeLabel={() => ""}
          linkThreeObject={linkObject}
          linkLabel={(link) => candidate ? "候选推荐 · 尚未确认" : `${kindNames[link.edge.kind]} · ${!shared(link.edge) ? "私人，仅本人可读" : link.edge.objective ? "客观关系" : "双方确认"}`}
          linkPositionUpdate={(object, { start, end }, raw) => {
            const link = raw as unknown as SpatialLink;
            const progress = reducedMotion ? 1 : Math.min(1, Math.max(0, (performance.now() - link.born) / 360));
            const line = object as Line;
            const positions = line.geometry.getAttribute("position");
            positions.setXYZ(0, start.x, start.y, start.z);
            positions.setXYZ(1, start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress, start.z + (end.z - start.z) * progress);
            positions.needsUpdate = true;
            line.geometry.computeBoundingSphere();
            line.computeLineDistances();
            return true;
          }}
          onNodeClick={(node) => onSelect(node.id)}
          d3AlphaMin={0} cooldownTime={500} warmupTicks={0}
          onEngineTick={() => {
            for (const node of data.nodes) {
              const progress = reducedMotion ? 1 : Math.min(1, Math.max(0.05, (performance.now() - node.born) / 360));
              objects.current.get(node.id)?.scale.setScalar(1 - (1 - progress) ** 3);
            }
            updateLabels();
          }}
          onEngineStop={() => { for (const object of objects.current.values()) object.scale.setScalar(1); updateLabels(); }}
        />
      )}
    </div>
  );
}
