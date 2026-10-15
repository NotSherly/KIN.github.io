import { shared, touches, other, type Edge } from "./model";

export const DEMO_NODE_LIMIT = 24;
export type Point3D = { x: number; y: number; z: number };
export type LayoutNode = Point3D & {
  id: string;
  depth: number;
  parent?: string;
  branch: string;
};

// This module only receives the visible graph. It never reads hidden relationships.
export function visiblePath(ids: string[], edges: Edge[], actor: string, to: string) {
  const visible = new Set(ids);
  const queue = [{ ids: [actor], edges: [] as Edge[] }];
  const visited = new Set([actor]);
  while (queue.length) {
    const route = queue.shift()!;
    const current = route.ids.at(-1)!;
    if (current === to) return route;
    for (const edge of edges) {
      if (!touches(edge, current) || edge.status !== "active") continue;
      const next = other(edge, current);
      if (!visible.has(next) || visited.has(next)) continue;
      // A private direct relationship is readable by its participant, but cannot relay.
      if (!shared(edge) && !(current === actor && next === to)) continue;
      visited.add(next);
      queue.push({ ids: [...route.ids, next], edges: [...route.edges, edge] });
    }
  }
  return { ids: [] as string[], edges: [] as Edge[] };
}

export function layoutGraph(ids: string[], edges: Edge[], actor: string): LayoutNode[] {
  const visible = new Set(ids.slice(0, DEMO_NODE_LIMIT));
  const nodes: LayoutNode[] = [{ id: actor, depth: 0, branch: actor, x: 0, y: 0, z: 0 }];
  const visited = new Set([actor]);
  const angles = new Map<string, number>();
  for (let index = 0; index < nodes.length; index++) {
    const current = nodes[index];
    const children = edges
      .filter((edge) => touches(edge, current.id))
      .map((edge) => ({ id: other(edge, current.id), kind: edge.kind }))
      .filter(({ id }) => visible.has(id) && !visited.has(id))
      .sort((a, b) => {
        const order = { family: 0, friend: 1, colleague: 2 };
        return order[a.kind] - order[b.kind] || a.id.localeCompare(b.id);
      })
      .filter(({ id }) => {
        if (visited.has(id)) return false;
        visited.add(id);
        return true;
      });
    children.forEach(({ id }, sibling) => {
      const depth = current.depth + 1;
      const branch = depth === 1 ? id : current.branch;
      const angle = depth === 1
        ? Math.PI / 2 + sibling * Math.PI * 2 / children.length
        : angles.get(branch)!;
      angles.set(branch, angle);
      // Carry each parent's lateral position into its children, keeping sub-branches apart.
      const inheritedSpread = depth === 1 ? 0 : -Math.sin(angle) * current.x + Math.cos(angle) * current.y;
      const spread = inheritedSpread + (depth === 1 ? 0 : (sibling - (children.length - 1) / 2) * 112);
      nodes.push({
        id, depth, branch, parent: current.id,
        x: Math.cos(angle) * depth * 136 - Math.sin(angle) * spread,
        y: Math.sin(angle) * depth * 136 + Math.cos(angle) * spread,
        z: Math.cos(angle * 2) * depth * 36 + spread * 0.4,
      });
    });
  }
  return nodes;
}
