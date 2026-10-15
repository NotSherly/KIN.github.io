import { z } from "zod";

export const kindNames = {
  family: "亲属",
  friend: "朋友",
  colleague: "同事",
} as const;
export type Kind = keyof typeof kindNames;
export type Layer = "all" | "formal" | "private" | "candidate";
export const people = [
  {
    id: "lin",
    name: "林知夏",
    role: "设计系学生",
    color: "#7265df",
    bio: "喜欢记录日常，也在寻找家族故事里的连接。",
  },
  {
    id: "zhou",
    name: "周予安",
    role: "独立插画师",
    color: "#547cce",
    bio: "把城市散步时的偶遇画进速写本。",
  },
  {
    id: "chen",
    name: "陈见川",
    role: "社区策展人",
    color: "#bc739e",
    bio: "组织小型展览，让附近的人彼此认识。",
  },
  {
    id: "lin2",
    name: "林书禾",
    role: "植物研究员",
    color: "#579a90",
    bio: "用植物标本保存季节的记忆。",
  },
  {
    id: "xu",
    name: "许星遥",
    role: "建筑实习生",
    color: "#8d77b8",
    bio: "对老街与公共空间充满好奇。",
  },
  {
    id: "he",
    name: "何听澜",
    role: "书店店员",
    color: "#c29360",
    bio: "相信一次读书会可以连接不同的人。",
  },
  {
    id: "su",
    name: "苏望野",
    role: "陶艺爱好者",
    color: "#5c8fa8",
    bio: "一个独立的模拟用户，适合演示无路径场景。",
  },
  {
    id: "fang", name: "林砚秋", role: "地方志编辑", color: "#648c9c",
    bio: "在旧照片和口述故事里整理家族的记忆。",
  },
  {
    id: "qiao", name: "乔映山", role: "生态摄影师", color: "#669b87",
    bio: "与林书禾一起记录山间的植物与四季。",
  },
  {
    id: "ning", name: "林予宁", role: "历史系学生", color: "#7e9d92",
    bio: "跟随林砚秋走访老屋，收集地方故事。",
  },
  {
    id: "bai", name: "白清和", role: "诗歌译者", color: "#b49377",
    bio: "在书店的小型读书会上分享自己的译作。",
  },
  {
    id: "ye", name: "叶书行", role: "独立出版人", color: "#b29966",
    bio: "和何听澜一起策划主题书展与阅读活动。",
  },
  {
    id: "meng", name: "孟时雨", role: "动画设计师", color: "#698bc4",
    bio: "与周予安交换速写，把日常片段做成动画。",
  },
  {
    id: "gu", name: "顾澄", role: "视觉设计师", color: "#8b82ba",
    bio: "在合作项目中认识周予安，喜欢研究书籍装帧。",
  },
  {
    id: "ji", name: "纪南音", role: "声音采集者", color: "#8a91bf",
    bio: "与朋友记录街巷里的声音，也举办小型聆听会。",
  },
  {
    id: "wei", name: "卫川", role: "展陈设计师", color: "#ae82a6",
    bio: "与陈见川共同布置社区展览，让故事被更多人看见。",
  },
  {
    id: "jiang", name: "江予白", role: "社区志愿者", color: "#bd8799",
    bio: "通过一次邻里展览，与陈见川成为朋友。",
  },
  {
    id: "cheng", name: "程望", role: "城市研究员", color: "#9a89ba",
    bio: "与许星遥一起观察老街中的公共空间。",
  },
  {
    id: "tang", name: "唐以宁", role: "交互设计师", color: "#717fc0",
    bio: "与林知夏在一个社区设计项目中合作。",
  },
  {
    id: "wen", name: "温栖", role: "产品研究员", color: "#688fae",
    bio: "与唐以宁一起走访用户，记录日常生活中的细节。",
  },
  {
    id: "song", name: "宋予澄", role: "公共艺术创作者", color: "#828cbd",
    bio: "和唐以宁在工作之外讨论城市里的小型艺术计划。",
  },
  {
    id: "liao", name: "廖行舟", role: "服务设计师", color: "#789eb0",
    bio: "与温栖共同整理社区调研中的发现。",
  },
  {
    id: "shao", name: "邵雨桐", role: "陶艺工作者", color: "#a28aaf",
    bio: "在宋予澄组织的创作活动里认识了新朋友。",
  },
  {
    id: "lu", name: "陆青禾", role: "信息设计师", color: "#889cb9",
    bio: "与唐以宁合作，把复杂的信息整理成容易理解的图形。",
  },
];
export const person = (id: string) => people.find((p) => p.id === id)!;
const personId = z.enum([
  "lin", "zhou", "chen", "lin2", "xu", "he", "su",
  "fang", "qiao", "ning", "bai", "ye", "meng", "gu", "ji",
  "wei", "jiang", "cheng", "tang", "wen", "song", "liao", "shao", "lu",
]);
const kindSchema = z.enum(["family", "friend", "colleague"]);
const edgeSchema = z.object({
  id: z.string(),
  a: personId,
  b: personId,
  kind: kindSchema,
  objective: z.boolean(),
  origin: z.enum(["factual", "confirmed"]),
  status: z.enum(["active", "exited"]),
  share: z.record(z.string(), z.boolean()),
  fadedBy: z.array(personId),
});
const claimSchema = z.object({
  id: z.string(),
  from: personId,
  to: personId,
  kind: kindSchema,
  share: z.boolean(),
  status: z.enum(["pending", "accepted", "rejected"]),
  at: z.string(),
});
const eventSchema = z.object({
  id: z.string(),
  actor: personId,
  text: z.string(),
  at: z.string(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  edges: z.array(edgeSchema),
  claims: z.array(claimSchema),
  history: z.array(eventSchema),
});
export type Edge = z.infer<typeof edgeSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type State = z.infer<typeof stateSchema>;
export function seed(): State {
  const edge = (
    id: string,
    a: Edge["a"],
    b: Edge["b"],
    kind: Kind,
    objective = false,
    shared = true,
  ): Edge => ({
    id,
    a,
    b,
    kind,
    objective,
    origin: objective ? "factual" : "confirmed",
    status: "active",
    share: { [a]: shared, [b]: shared },
    fadedBy: [],
  });
  return {
    version: 1,
    edges: [
      edge("e1", "lin", "lin2", "family", true),
      edge("e2", "lin", "zhou", "friend"),
      edge("e3", "zhou", "chen", "colleague"),
      edge("e4", "chen", "xu", "friend"),
      edge("e5", "lin2", "he", "friend"),
      edge("e6", "lin", "he", "friend", false, false),
      edge("demo-family-1", "lin2", "fang", "family", true),
      edge("demo-family-2", "lin2", "qiao", "colleague"),
      edge("demo-family-3", "fang", "ning", "family", true),
      edge("demo-books-1", "he", "bai", "friend"),
      edge("demo-books-2", "he", "ye", "colleague"),
      edge("demo-friends-1", "zhou", "meng", "friend"),
      edge("demo-friends-2", "zhou", "gu", "colleague"),
      edge("demo-friends-3", "zhou", "ji", "friend"),
      edge("demo-friends-4", "chen", "wei", "colleague"),
      edge("demo-friends-5", "chen", "jiang", "friend"),
      edge("demo-friends-6", "xu", "cheng", "colleague"),
      edge("demo-work-1", "lin", "tang", "colleague"),
      edge("demo-work-2", "tang", "wen", "colleague"),
      edge("demo-work-3", "tang", "song", "friend"),
      edge("demo-work-4", "tang", "lu", "colleague"),
      edge("demo-work-5", "wen", "liao", "colleague"),
      edge("demo-work-6", "song", "shao", "friend"),
    ],
    claims: [],
    history: [],
  };
}
export const touches = (e: Edge, id: string) => e.a === id || e.b === id;
export const other = (e: Edge, id: string) => (e.a === id ? e.b : e.a);
export const shared = (e: Edge) =>
  e.status === "active" && e.share[e.a] === true && e.share[e.b] === true;
export function edgeLayer(e: Edge): Layer {
  return e.objective || shared(e) ? "formal" : "private";
}
export function personalGraph(
  state: State,
  actor: string,
  expanded: string[],
  layer: Layer,
) {
  const allowed = state.edges.filter(
    (e) =>
      e.status === "active" &&
      (shared(e) || touches(e, actor)) &&
      (layer === "all" || edgeLayer(e) === layer),
  );
  const ids = new Set([actor]);
  const used = new Set<string>();
  const queue = [actor];
  const relayed = new Set([actor]);
  while (queue.length) {
    const current = queue.shift()!;
    if (!expanded.includes(current)) continue;
    for (const e of allowed.filter((e) => touches(e, current))) {
      // Private direct edges can be inspected, but cannot relay another person's graph.
      if (!shared(e) && current !== actor) continue;
      used.add(e.id);
      const next = other(e, current);
      ids.add(next);
      if (shared(e) && !relayed.has(next)) {
        relayed.add(next);
        queue.push(next);
      }
    }
  }
  return { ids: [...ids], edges: allowed.filter((e) => used.has(e.id)) };
}
export type Scope = { types: Kind[]; depth: number; consent: boolean };
export function findPath(
  state: State,
  from: string,
  to: string,
  a: Scope,
  b: Scope,
): { status: "rejected" | "no-path" | "found"; ids: string[]; edges: Edge[] } {
  if (!a.consent || !b.consent)
    return { status: "rejected", ids: [], edges: [] };
  const types = a.types.filter((t) => b.types.includes(t));
  const limit = Math.min(a.depth, b.depth);
  const edges = state.edges.filter((e) => shared(e) && types.includes(e.kind));
  const queue = [{ ids: [from], edges: [] as Edge[] }];
  const visited = new Set([from]);
  while (queue.length) {
    const route = queue.shift()!;
    const last = route.ids.at(-1)!;
    if (last === to) return { status: "found", ...route };
    if (route.edges.length >= limit) continue;
    for (const e of edges.filter((e) => touches(e, last))) {
      const next = other(e, last);
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push({ ids: [...route.ids, next], edges: [...route.edges, e] });
    }
  }
  return { status: "no-path", ids: [], edges: [] };
}
const log = (s: State, actor: string, text: string): State => ({
  ...s,
  history: [
    {
      id: crypto.randomUUID(),
      actor: actor as Edge["a"],
      text,
      at: new Date().toISOString(),
    },
    ...s.history,
  ],
});
export function requestClaim(
  s: State,
  actor: string,
  to: string,
  kind: Kind,
  share: boolean,
): State {
  if (
    actor === to ||
    !people.some((p) => p.id === to) ||
    s.edges.some(
      (e) => e.status === "active" && touches(e, actor) && touches(e, to),
    ) ||
    s.claims.some(
      (c) =>
        c.status === "pending" &&
        [c.from, c.to].includes(actor as Claim["from"]) &&
        [c.from, c.to].includes(to as Claim["to"]),
    )
  )
    return s;
  const c: Claim = {
    id: crypto.randomUUID(),
    from: actor as Claim["from"],
    to: to as Claim["to"],
    kind,
    share,
    status: "pending",
    at: new Date().toISOString(),
  };
  return log(
    { ...s, claims: [...s.claims, c] },
    actor,
    `向${person(to).name}申请确认${kindNames[kind]}关系，等待对方回应`,
  );
}
export function respondClaim(
  s: State,
  actor: string,
  id: string,
  accept: boolean,
  share: boolean,
): State {
  const c = s.claims.find(
    (c) => c.id === id && c.to === actor && c.status === "pending",
  );
  if (!c) return s;
  const exists = s.edges.some(
    (e) => e.status === "active" && touches(e, c.from) && touches(e, c.to),
  );
  const status = accept && !exists ? "accepted" : "rejected";
  const edges: Edge[] =
    status === "accepted"
      ? [
          ...s.edges,
          {
            id: crypto.randomUUID(),
            a: c.from,
            b: c.to,
            kind: c.kind,
            objective: false,
            origin: "confirmed",
            status: "active",
            share: { [c.from]: c.share, [c.to]: share },
            fadedBy: [],
          },
        ]
      : s.edges;
  return log(
    {
      ...s,
      edges,
      claims: s.claims.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    },
    actor,
    `${status === "accepted" ? "接受" : "拒绝"}了${person(c.from).name}的关系认领${status === "accepted" ? "，建立双方确认关系" : "，未建立关系"}`,
  );
}
export function changeRelation(
  s: State,
  actor: string,
  id: string,
  action: "keep" | "fade" | "share" | "private" | "exit",
): State {
  const edge = s.edges.find((e) => e.id === id);
  if (
    !edge ||
    !touches(edge, actor) ||
    edge.status === "exited" ||
    (action === "exit" && edge.objective)
  )
    return s;
  const next: Edge = {
    ...edge,
    share: { ...edge.share },
    fadedBy: [...edge.fadedBy],
  };
  if (action === "exit") next.status = "exited";
  if (action === "share" || action === "private")
    next.share[actor] = action === "share";
  if (action === "fade")
    next.fadedBy = [...new Set([...next.fadedBy, actor as Edge["a"]])];
  if (action === "keep")
    next.fadedBy = next.fadedBy.filter((id) => id !== actor);
  const names = {
    keep: "保持关系",
    fade: "仅在自己的谱系中淡化",
    share: "允许个人侧共享",
    private: "关闭个人侧共享",
    exit: "单方退出自愿共同关系，保留历史记录",
  };
  return log(
    { ...s, edges: s.edges.map((e) => (e.id === id ? next : e)) },
    actor,
    `${person(other(edge, actor)).name}：${names[action]}`,
  );
}
export const STORAGE_KEY = "kin-demo-v1";
export function decodeState(raw: string | null): State {
  try {
    const saved = stateSchema.parse(JSON.parse(raw ?? "null"));
    // Add only new sample edges; never replace saved privacy, exit, claim or history data.
    const known = new Set(saved.edges.map((edge) => edge.id));
    const additions = seed().edges.filter((edge) => edge.id.startsWith("demo-") && !known.has(edge.id));
    return additions.length ? { ...saved, edges: [...saved.edges, ...additions] } : saved;
  } catch {
    return seed();
  }
}
