import { describe, it, expect } from "vitest";
import {
  seed,
  findPath,
  personalGraph,
  changeRelation,
  requestClaim,
  respondClaim,
  decodeState,
  shared,
  type Scope,
} from "./model";
const scope: Scope = {
  types: ["family", "friend", "colleague"],
  depth: 3,
  consent: true,
};
describe("授权与逐层展开", () => {
  it("从自己的一层开始，再点击周予安展开下一层", () => {
    expect(personalGraph(seed(), "lin", ["lin"], "all").ids).not.toContain(
      "chen",
    );
    expect(personalGraph(seed(), "lin", ["lin", "zhou"], "all").ids).toContain(
      "chen",
    );
  });
  it("两层授权交集找到路径，但不建立直接关系", () => {
    const s = seed();
    const route = findPath(s, "lin", "chen", scope, scope);
    expect(route.status).toBe("found");
    expect(route.ids).toEqual(["lin", "zhou", "chen"]);
    expect(s.edges).toHaveLength(6);
  });
  it("较小层数限制与类型交集都生效", () => {
    expect(
      findPath(seed(), "lin", "chen", scope, { ...scope, depth: 1 }).status,
    ).toBe("no-path");
    expect(
      findPath(seed(), "lin", "chen", scope, { ...scope, types: ["friend"] })
        .status,
    ).toBe("no-path");
    expect(
      findPath(seed(), "lin", "chen", { ...scope, types: [] }, scope).status,
    ).toBe("no-path");
  });
  it("任意一方拒绝后不返回任何人物或边", () => {
    expect(
      findPath(seed(), "lin", "chen", scope, { ...scope, consent: false }),
    ).toEqual({ status: "rejected", ids: [], edges: [] });
  });
  it("孤立候选不自动进入关系图或寻路", () => {
    expect(findPath(seed(), "lin", "su", scope, scope).status).toBe("no-path");
    expect(
      personalGraph(
        seed(),
        "lin",
        ["lin", "zhou", "chen", "xu", "he", "lin2"],
        "all",
      ).ids,
    ).not.toContain("su");
  });
  it("逐边检查第三方授权，关闭中间边会阻断路径", () => {
    const s = changeRelation(seed(), "zhou", "e3", "private");
    expect(findPath(s, "lin", "chen", scope, scope).status).toBe("no-path");
    expect(personalGraph(s, "lin", ["lin", "zhou"], "all").ids).not.toContain(
      "chen",
    );
  });
  it("私密直连只保留在自己的视图，不作为共享捷径", () => {
    expect(personalGraph(seed(), "lin", ["lin"], "private").ids).toEqual([
      "lin",
      "he",
    ]);
    expect(
      findPath(seed(), "lin", "he", scope, { ...scope, depth: 1 }).status,
    ).toBe("no-path");
    expect(findPath(seed(), "lin", "he", scope, scope).ids).toEqual([
      "lin",
      "lin2",
      "he",
    ]);
  });
});
describe("关系认领", () => {
  it("申请不改变关系，发起方不能替对方接受", () => {
    const s = requestClaim(seed(), "lin", "chen", "friend", false);
    expect(s.edges).toHaveLength(6);
    expect(s.claims[0].status).toBe("pending");
    expect(respondClaim(s, "lin", s.claims[0].id, true, true)).toBe(s);
  });
  it("接收方接受后创建直接确认关系，任意一方私密即不共享", () => {
    const pending = requestClaim(seed(), "lin", "chen", "friend", false);
    const accepted = respondClaim(
      pending,
      "chen",
      pending.claims[0].id,
      true,
      true,
    );
    expect(accepted.edges).toHaveLength(7);
    expect(accepted.edges.at(-1)?.origin).toBe("confirmed");
    expect(shared(accepted.edges.at(-1)!)).toBe(false);
    expect(findPath(accepted, "lin", "chen", scope, scope).edges).toHaveLength(
      2,
    );
  });
  it("拒绝不会建立关系，重复回应无效", () => {
    const s = requestClaim(seed(), "lin", "su", "friend", true);
    const rejected = respondClaim(s, "su", s.claims[0].id, false, false);
    expect(rejected.edges).toHaveLength(6);
    expect(rejected.claims[0].status).toBe("rejected");
    expect(respondClaim(rejected, "su", s.claims[0].id, true, true)).toBe(
      rejected,
    );
  });
  it("阻止自我认领、重复申请、反向重复和已有关系认领", () => {
    const s = seed();
    expect(requestClaim(s, "lin", "lin", "friend", true)).toBe(s);
    expect(requestClaim(s, "lin", "zhou", "friend", true)).toBe(s);
    const pending = requestClaim(s, "lin", "chen", "friend", true);
    expect(requestClaim(pending, "chen", "lin", "friend", true)).toBe(pending);
  });
});
describe("生命周期与保存", () => {
  it("第三方不能修改权限，单方修改不覆盖另一方权限", () => {
    const s = seed();
    expect(changeRelation(s, "su", "e2", "private")).toBe(s);
    const next = changeRelation(s, "lin", "e2", "private");
    expect(next.edges[1].share).toEqual({ lin: false, zhou: true });
  });
  it("淡化仅属于发起人，可恢复，不删除关系", () => {
    const s = changeRelation(seed(), "lin", "e2", "fade");
    expect(s.edges[1].fadedBy).toEqual(["lin"]);
    expect(s.edges[1].status).toBe("active");
    expect(changeRelation(s, "lin", "e2", "keep").edges[1].fadedBy).toEqual([]);
  });
  it("单方退出后终止共同边并保留历史，客观关系不受影响", () => {
    const s = changeRelation(seed(), "lin", "e2", "exit");
    expect(s.edges[1].status).toBe("exited");
    expect(findPath(s, "lin", "chen", scope, scope).status).toBe("no-path");
    expect(s.history[0].text).toContain("单方退出");
    expect(s.edges[0].status).toBe("active");
    expect(changeRelation(s, "lin", "e1", "exit")).toBe(s);
  });
  it("退出后必须重新申请确认，不能按保持直接恢复", () => {
    const s = changeRelation(seed(), "lin", "e2", "exit");
    expect(changeRelation(s, "zhou", "e2", "keep")).toBe(s);
    expect(requestClaim(s, "zhou", "lin", "friend", false).claims).toHaveLength(
      1,
    );
  });
  it("保存与恢复数据，损坏或旧格式恢复演示默认值", () => {
    const s = changeRelation(seed(), "lin", "e2", "exit");
    expect(decodeState(JSON.stringify(s))).toEqual(s);
    expect(decodeState("{bad")).toEqual(seed());
    expect(decodeState('{"version":999}')).toEqual(seed());
  });
});
