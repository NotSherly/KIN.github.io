import { describe, expect, it } from "vitest";
import { changeRelation, people, personalGraph, seed } from "./model";
import { DEMO_NODE_LIMIT, layoutGraph, visiblePath } from "./graphLayout";

describe("可视化遵循授权边界", () => {
  it("初始只显示直接连接，展开后才出现下一层", () => {
    const initial = personalGraph(seed(), "lin", ["lin"], "all");
    expect(layoutGraph(initial.ids, initial.edges, "lin").map((n) => n.id)).not.toContain("chen");
    const expanded = personalGraph(seed(), "lin", ["lin", "zhou"], "all");
    const nodes = layoutGraph(expanded.ids, expanded.edges, "lin");
    expect(nodes.find((n) => n.id === "lin")).toMatchObject({ x: 0, y: 0, z: 0, depth: 0 });
    expect(nodes.find((n) => n.id === "chen")).toMatchObject({ parent: "zhou", branch: "zhou", depth: 2 });
    expect(visiblePath(expanded.ids, expanded.edges, "lin", "chen").ids).toEqual(["lin", "zhou", "chen"]);
  });
  it("展开下层不移动已有分支，同一输入得到相同布局", () => {
    const s = seed();
    const initial = personalGraph(s, "lin", ["lin"], "all");
    const expanded = personalGraph(s, "lin", ["lin", "zhou", "chen"], "all");
    const before = layoutGraph(initial.ids, initial.edges, "lin");
    const after = layoutGraph(expanded.ids, expanded.edges, "lin");
    for (const node of before) expect(after.find((n) => n.id === node.id)).toEqual(node);
    expect(layoutGraph(expanded.ids, [...expanded.edges].reverse(), "lin")).toEqual(after);
  });
  it("收起后隐藏下游，其他独立分支仍然存在", () => {
    const s = seed();
    const expanded = ["lin", "zhou", "chen", "lin2"];
    const next = expanded.filter((id) => id !== "zhou");
    const visible = personalGraph(s, "lin", next, "formal").ids;
    const pruned = next.filter((id) => visible.includes(id));
    const graph = personalGraph(s, "lin", pruned, "formal");
    expect(graph.ids).not.toContain("chen");
    expect(graph.ids).not.toContain("xu");
    expect(graph.ids).toContain("he");
    expect(pruned).not.toContain("chen");
  });
  it("私密直连可以阅读，但不能通过它展开或推导他人的路径", () => {
    const graph = personalGraph(seed(), "lin", ["lin", "he"], "all");
    expect(visiblePath(graph.ids, graph.edges, "lin", "he").edges.map((e) => e.id)).toEqual(["e6"]);
    expect(graph.edges.map((e) => e.id)).not.toContain("e5");
    const noRelay = [seed().edges[5], seed().edges[4]];
    expect(visiblePath(["lin", "he", "lin2"], noRelay, "lin", "lin2").ids).toEqual([]);
  });
  it("关闭权限或退出后，可视化不再显示下游关系", () => {
    for (const action of ["private", "exit"] as const) {
      const s = changeRelation(seed(), "lin", "e2", action);
      const graph = personalGraph(s, "lin", ["lin", "zhou", "chen"], "all");
      expect(layoutGraph(graph.ids, graph.edges, "lin").map((n) => n.id)).not.toContain("chen");
      expect(visiblePath(graph.ids, graph.edges, "lin", "chen").ids).toEqual([]);
    }
  });
  it("布局不修改业务数据，也不把不可见节点加入网络", () => {
    const s = seed();
    const original = JSON.stringify(s);
    const graph = personalGraph(s, "lin", ["lin"], "all");
    const nodes = layoutGraph(graph.ids, s.edges, "lin");
    expect(nodes.every((n) => graph.ids.includes(n.id))).toBe(true);
    expect(nodes.length).toBeLessThanOrEqual(DEMO_NODE_LIMIT);
    expect(JSON.stringify(s)).toBe(original);
  });
  it("三个主要分支可以继续分叉，完全展开仍在演示上限内且不包含独立用户", () => {
    const state = seed();
    const initial = personalGraph(state, "lin", ["lin"], "all");
    expect(initial.ids).toHaveLength(5);
    for (const branch of ["lin2", "zhou", "tang"]) {
      const opened = personalGraph(state, "lin", ["lin", branch], "all");
      expect(opened.ids.length - initial.ids.length).toBeGreaterThanOrEqual(2);
    }
    const graph = personalGraph(state, "lin", people.map((p) => p.id), "all");
    expect(graph.ids).toHaveLength(23);
    expect(graph.ids).not.toContain("su");
    const nodes = layoutGraph(graph.ids, graph.edges, "lin");
    expect(nodes).toHaveLength(graph.ids.length);
    for (const a of nodes) for (const b of nodes) {
      if (a.id !== b.id) expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(30);
    }
    expect(nodes.length).toBeLessThanOrEqual(DEMO_NODE_LIMIT);
  });
});
