import { useEffect, useState } from "react";
import {
  Network,
  ScanLine,
  HeartHandshake,
  History,
  RotateCcw,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  X,
  Sparkles,
  Check,
  CircleHelp,
  LockKeyhole,
  Radio,
  Users,
  Clock3,
} from "lucide-react";
import Graph from "./Graph";
import {
  people,
  person,
  seed,
  decodeState,
  STORAGE_KEY,
  personalGraph,
  findPath,
  requestClaim,
  respondClaim,
  changeRelation,
  touches,
  other,
  shared,
  edgeLayer,
  kindNames,
  type Scope,
  type State,
  type Kind,
  type Layer,
  type Edge,
} from "./model";

const tabs = [
  { id: "graph", name: "个人谱系", icon: Network },
  { id: "tap", name: "模拟碰一碰", icon: ScanLine },
  { id: "relations", name: "关系管理", icon: HeartHandshake },
  { id: "history", name: "关系历史", icon: History },
] as const;
type Tab = (typeof tabs)[number]["id"];
const layerNames: Record<Layer, string> = {
  all: "全部关系",
  formal: "正式谱系",
  private: "私人谱系",
  candidate: "候选谱系",
};
const initialScope = (): Scope => ({
  types: ["family", "friend", "colleague"],
  depth: 3,
  consent: true,
});
function readTab(): Tab {
  const hash = location.hash.slice(1);
  return tabs.some((t) => t.id === hash) ? (hash as Tab) : "graph";
}
function Avatar({ id, size = "" }: { id: string; size?: string }) {
  const p = person(id);
  return (
    <span className={`avatar ${size}`} style={{ background: p.color }}>
      {p.name.slice(-2)}
    </span>
  );
}
function ScopePicker({
  id,
  title,
  value,
  onChange,
}: {
  id: string;
  title: string;
  value: Scope;
  onChange: (value: Scope) => void;
}) {
  return (
    <fieldset className="scope">
      <legend>{title}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(kindNames) as Kind[]).map((type) => (
          <label className="choice" key={type}>
            <input
              type="checkbox"
              checked={value.types.includes(type)}
              onChange={() =>
                onChange({
                  ...value,
                  types: value.types.includes(type)
                    ? value.types.filter((t) => t !== type)
                    : [...value.types, type],
                })
              }
            />
            {kindNames[type]}
          </label>
        ))}
      </div>
      <label className="field mt-4" htmlFor={`${id}-depth`}>
        最多共享几层
        <select
          id={`${id}-depth`}
          value={value.depth}
          onChange={(e) =>
            onChange({ ...value, depth: Number(e.target.value) })
          }
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} 层
            </option>
          ))}
        </select>
      </label>
      <label className="consent">
        <input
          type="checkbox"
          checked={value.consent}
          onChange={(e) => onChange({ ...value, consent: e.target.checked })}
        />
        同意本次临时共享
      </label>
    </fieldset>
  );
}
export default function App() {
  const [state, setState] = useState<State>(() => {
    try {
      return decodeState(localStorage.getItem(STORAGE_KEY));
    } catch {
      return seed();
    }
  });
  const [storageError, setStorageError] = useState(false);
  const [actor, setActor] = useState("lin");
  const [tab, setTab] = useState<Tab>(readTab);
  const [layer, setLayer] = useState<Layer>("all");
  const [selected, setSelected] = useState("lin");
  const [expanded, setExpanded] = useState(["lin"]);
  const [target, setTarget] = useState("chen");
  const [scopeA, setScopeA] = useState(initialScope);
  const [scopeB, setScopeB] = useState(initialScope);
  const [result, setResult] = useState<ReturnType<typeof findPath> | null>(
    null,
  );
  const [expires, setExpires] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [reveal, setReveal] = useState(1);
  const [claimTo, setClaimTo] = useState("chen");
  const [claimKind, setClaimKind] = useState<Kind>("friend");
  const [claimShare, setClaimShare] = useState(false);
  const [acceptShare, setAcceptShare] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const listener = () => setTab(readTab());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (expires && now >= expires) {
      setResult(null);
      setExpires(null);
      setExpired(true);
    }
  }, [now, expires]);
  useEffect(() => {
    if (result?.status !== "found") return;
    const timer = setInterval(
      () => setReveal((n) => Math.min(result.ids.length, n + 1)),
      430,
    );
    return () => clearInterval(timer);
  }, [result]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(t: Tab) {
    location.hash = t;
    setTab(t);
  }
  function clearSession() {
    setResult(null);
    setExpires(null);
    setExpired(false);
    setReveal(1);
  }
  function switchActor(id: string) {
    setActor(id);
    setSelected(id);
    setExpanded([id]);
    setLayer("all");
    setTarget(id === "chen" ? "lin" : "chen");
    setClaimTo(id === "chen" ? "lin" : "chen");
    setAcceptShare({});
    clearSession();
  }
  function update(next: State, message: string) {
    if (next === state) {
      setNotice("操作未执行：已有关系或待处理申请，或当前身份没有权限。");
      return;
    }
    setState(next);
    clearSession();
    setNotice(message);
  }
  function send(to = claimTo) {
    update(
      requestClaim(state, actor, to, claimKind, claimShare),
      "申请已发送。请切换为对方身份，在关系管理中回应。",
    );
  }
  const own = state.edges.filter(
    (e) => e.status === "active" && touches(e, actor),
  );
  const pending = state.claims.filter(
    (c) => c.to === actor && c.status === "pending",
  );
  const candidates = people.filter(
    (p) => p.id !== actor && !own.some((e) => touches(e, p.id)),
  );
  const graph = personalGraph(state, actor, expanded, layer);
  const candidateEdges: Edge[] = candidates.map((p) => ({
    id: `candidate-${p.id}`,
    a: actor as Edge["a"],
    b: p.id as Edge["b"],
    kind: "friend",
    objective: false,
    origin: "confirmed",
    status: "active",
    share: {},
    fadedBy: [],
  }));
  const direct = own.find((e) => touches(e, selected));
  function selectNode(id: string) {
    setSelected(id);
    if (layer !== "candidate")
      setExpanded((prev) => [...new Set([...prev, id])]);
  }
  function lifecycle(edge: Edge, action: Parameters<typeof changeRelation>[3]) {
    update(
      changeRelation(state, actor, edge.id, action),
      action === "exit"
        ? "已退出共同关系，历史保留。"
        : "已更新自己的关系设置。",
    );
  }
  const routeClaimExists =
    own.some((e) => touches(e, target)) ||
    state.claims.some(
      (c) =>
        c.status === "pending" &&
        [c.from, c.to].includes(actor as Edge["a"]) &&
        [c.from, c.to].includes(target as Edge["a"]),
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#graph" aria-label="谱系 KIN 首页">
          <span className="brand-mark">
            <Network size={25} />
          </span>
          <span>
            KIN<span className="brand-cn">谱系</span>
          </span>
        </a>
        <div className="workspace-label">我的关系空间</div>
        <nav aria-label="主导航">
          {tabs.map((t) => (
            <button
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              key={t.id}
              onClick={() => navigate(t.id)}
            >
              <t.icon size={20} />
              <span>{t.name}</span>
              {t.id === "relations" && pending.length > 0 && (
                <b>{pending.length}</b>
              )}
              {tab === t.id && <ChevronRight className="nav-arrow" size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={21} />
          <strong>连接，始于彼此同意</strong>
          <p>
            算法发现路径，
            <br />
            关系由你们定义。
          </p>
        </div>
        <button className="reset-button" onClick={() => setResetOpen(true)}>
          <RotateCcw size={16} />
          重置演示数据
        </button>
        <span className="version">KIN / INTERACTIVE DEMO 01</span>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            我的空间 <ChevronRight size={14} />
            <strong>{tabs.find((t) => t.id === tab)?.name}</strong>
          </div>
          <div className="identity">
            <span className="demo-badge">
              <i />
              虚构人物演示
            </span>
            <Avatar id={actor} />
            <label className="sr-only" htmlFor="actor">
              当前模拟用户
            </label>
            <select
              id="actor"
              value={actor}
              onChange={(e) => switchActor(e.target.value)}
            >
              {people.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="alert" role="alert">
              浏览器无法保存本地数据；本次仍可操作，刷新后可能丢失。
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "graph"
                  ? "YOUR CONNECTIONS"
                  : tab === "tap"
                    ? "A MOMENT OF CONNECTION"
                    : tab === "relations"
                      ? "RELATIONSHIPS & BOUNDARIES"
                      : "YOUR RELATIONSHIP JOURNAL"}
              </div>
              <h1>
                {tab === "graph"
                  ? "每一条连接，都有来处。"
                  : tab === "tap"
                    ? "碰一碰，发现彼此的连接。"
                    : tab === "relations"
                      ? "让关系，由彼此确认。"
                      : "留下变化，也尊重离开。"}
              </h1>
              <p>
                {tab === "graph"
                  ? "从自己出发，逐层探索获授权的关系网络。"
                  : tab === "tap"
                    ? "在一次限时共享中，寻找双方都允许被看见的路径。"
                    : tab === "relations"
                      ? "管理认领申请、共享范围与关系的生命周期。"
                      : "所有变更保留时间与发起身份，退出不会抹去历史。"}
              </p>
            </div>
            {tab === "graph" && (
              <button className="primary" onClick={() => navigate("tap")}>
                <ScanLine size={18} />
                模拟碰一碰
                <ArrowUpRight size={17} />
              </button>
            )}
          </div>

          {tab === "graph" && (
            <>
              <div className="stats-grid">
                <div>
                  <span className="stat-icon violet">
                    <Users size={20} />
                  </span>
                  <div>
                    <strong>
                      {own.length}
                      <small> 条</small>
                    </strong>
                    <p>我的直接连接</p>
                  </div>
                </div>
                <div>
                  <span className="stat-icon blue">
                    <ShieldCheck size={20} />
                  </span>
                  <div>
                    <strong>
                      {own.filter((e) => edgeLayer(e) === "formal").length}
                      <small> 条</small>
                    </strong>
                    <p>正式谱系关系</p>
                  </div>
                </div>
                <div>
                  <span className="stat-icon pink">
                    <LockKeyhole size={20} />
                  </span>
                  <div>
                    <strong>
                      {own.filter((e) => edgeLayer(e) === "private").length}
                      <small> 条</small>
                    </strong>
                    <p>私人谱系关系</p>
                  </div>
                </div>
              </div>
              <div className="graph-layout">
                <section className="graph-card">
                  <div className="graph-heading">
                    <div>
                      <h2>我的谱系</h2>
                      <p>
                        {layer === "candidate"
                          ? "候选只作为推荐，虚线不代表关系。"
                          : "点击人物节点，继续展开其获授权的连接。"}
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="收起到第一层"
                      title="收起到第一层"
                      onClick={() => {
                        setExpanded([actor]);
                        setSelected(actor);
                      }}
                    >
                      <RotateCcw size={17} />
                    </button>
                  </div>
                  <div className="layer-tabs" aria-label="谱系层级">
                    {(Object.keys(layerNames) as Layer[]).map((l) => (
                      <button
                        key={l}
                        aria-pressed={layer === l}
                        className={layer === l ? "selected" : ""}
                        onClick={() => {
                          setLayer(l);
                          setSelected(actor);
                        }}
                      >
                        {layerNames[l]}
                      </button>
                    ))}
                  </div>
                  <div className="network-canvas">
                    <Graph
                      ids={
                        layer === "candidate"
                          ? [actor, ...candidates.map((p) => p.id)]
                          : graph.ids
                      }
                      edges={
                        layer === "candidate" ? candidateEdges : graph.edges
                      }
                      actor={actor}
                      expanded={expanded}
                      onSelect={selectNode}
                      candidate={layer === "candidate"}
                    />
                    <div className="canvas-caption">
                      <Radio size={14} />
                      {layer === "candidate"
                        ? `${candidates.length} 位候选 · 尚未建立关系`
                        : `${graph.ids.length} 位可见人物 · 逐层授权展开`}
                    </div>
                  </div>
                  <div className="graph-legend">
                    <span>
                      <i className="dot blue-dot" />
                      客观关系
                    </span>
                    <span>
                      <i className="dot purple-dot" />
                      双方确认
                    </span>
                    <span>
                      <i className="dash" />
                      候选推荐
                    </span>
                    <span className="ml-auto">滚轮缩放 · 拖动画布</span>
                  </div>
                </section>
                <aside className="detail-panel">
                  <span className="eyebrow">
                    {selected === actor ? "MY PROFILE" : "CONNECTION DETAILS"}
                  </span>
                  <Avatar id={selected} size="large" />
                  <h2>
                    {person(selected).name}
                    {selected === actor && <small>我</small>}
                  </h2>
                  <span className="subtle">
                    {person(selected).role} · 虚构人物
                  </span>
                  <p className="bio">{person(selected).bio}</p>
                  <hr />
                  {selected === actor ? (
                    <>
                      <h3>从熟悉的人开始</h3>
                      <p className="subtle">
                        点击网络中的人物，逐层展开关系。每条连接都遵守双方的共享设置。
                      </p>
                      <div className="profile-facts">
                        <span>
                          关系中心 <b>自己</b>
                        </span>
                        <span>
                          数据存储 <b>当前浏览器</b>
                        </span>
                        <span>
                          推荐关系 <b>始终等待确认</b>
                        </span>
                      </div>
                    </>
                  ) : direct ? (
                    <>
                      <span className="status-badge">
                        {direct.objective
                          ? "客观关系 · 独立保留"
                          : "双方直接确认"}
                      </span>
                      <h3 className="mt-4">{kindNames[direct.kind]}关系</h3>
                      <p className="subtle">
                        {shared(direct)
                          ? "双方允许共享，可参与授权路径搜索。"
                          : "至少一方设为私密，不参与碰一碰寻路。"}
                      </p>
                      <button
                        className="secondary w-full mt-4"
                        onClick={() => navigate("relations")}
                      >
                        管理这段关系
                        <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="status-badge muted">
                        {layer === "candidate"
                          ? "候选推荐 · 尚未确认"
                          : "系统路径推导 · 非直接确认"}
                      </span>
                      <p className="subtle mt-4">
                        发现连接并不等于建立关系。认领需要对方接受。
                      </p>
                      <button
                        className="primary w-full mt-4"
                        onClick={() => {
                          setClaimTo(selected);
                          navigate("relations");
                        }}
                      >
                        申请关系认领
                        <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                  <div className="privacy-note">
                    <ShieldCheck size={18} />
                    <p>
                      谁有权定义人与人的关系？
                      <br />
                      <strong>你，以及关系中的另一方。</strong>
                    </p>
                  </div>
                </aside>
              </div>
              <div className="bottom-note">
                <CircleHelp size={17} />
                <p>
                  正式谱系包含客观关系和双方同意共享的确认关系；私人谱系保留直接私密连接；候选谱系不参与寻路。
                </p>
              </div>
            </>
          )}

          {tab === "tap" && (
            <div className="tap-layout">
              <section className="card tap-controls">
                <div className="section-kicker">
                  <ScanLine size={19} />
                  建立临时共享
                </div>
                <label className="field mt-5">
                  另一位模拟用户
                  <select
                    aria-label="碰一碰对象"
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      clearSession();
                    }}
                  >
                    {people
                      .filter((p) => p.id !== actor)
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                          {p.id === "su" ? "（独立节点）" : ""}
                        </option>
                      ))}
                  </select>
                </label>
                <ScopePicker
                  id="mine"
                  title={`${person(actor).name}的选择`}
                  value={scopeA}
                  onChange={(s) => {
                    setScopeA(s);
                    clearSession();
                  }}
                />
                <ScopePicker
                  id="theirs"
                  title={`${person(target).name}的选择（模拟对方）`}
                  value={scopeB}
                  onChange={(s) => {
                    setScopeB(s);
                    clearSession();
                  }}
                />
                <p className="scope-explanation">
                  仅使用类型交集；较小层数为本次路径上限。每条边还需原关系双方授权。候选和已退出关系均不可参与。
                </p>
                <button
                  className="primary w-full"
                  onClick={() => {
                    setReveal(1);
                    setExpired(false);
                    setResult(findPath(state, actor, target, scopeA, scopeB));
                    setExpires(Date.now() + 120000);
                    setNow(Date.now());
                  }}
                >
                  <ScanLine size={18} />
                  开始模拟碰一碰
                </button>
              </section>
              <section className="graph-card session-card">
                <div className="graph-heading">
                  <div>
                    <h2>这一次，我们如何相连？</h2>
                    <p>临时会话不会合并任何人的个人谱系。</p>
                  </div>
                  {expires && (
                    <span className="timer">
                      <Clock3 size={15} />
                      {Math.max(0, Math.ceil((expires - now) / 1000))} 秒
                    </span>
                  )}
                </div>
                {result?.status === "found" ? (
                  <>
                    <div className="result-banner">
                      <Check size={18} />
                      发现 {result.edges.length} 层可见路径
                      <span>系统推导，未经双方直接确认</span>
                    </div>
                    <div className="session-graph">
                      <Graph
                        ids={result.ids.slice(0, reveal)}
                        edges={result.edges}
                        actor={actor}
                        path
                      />
                    </div>
                    <div className="path-text">
                      {result.ids.map((id) => person(id).name).join(" → ")}
                    </div>
                    <div className="session-actions">
                      <button
                        className="primary"
                        disabled={routeClaimExists}
                        onClick={() => {
                          setClaimTo(target);
                          navigate("relations");
                        }}
                      >
                        {routeClaimExists
                          ? "已有直接关系或待处理申请"
                          : "可选：申请直接关系认领"}
                      </button>
                      <button className="secondary" onClick={clearSession}>
                        结束临时共享
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div
                      className={`empty-orbit ${result || expired ? "quiet" : ""}`}
                    >
                      <ScanLine size={38} />
                    </div>
                    <h2>
                      {expired
                        ? "临时共享已到期"
                        : result?.status === "rejected"
                          ? "对方或你已拒绝授权"
                          : result?.status === "no-path"
                            ? "当前授权范围内没有可见路径"
                            : "一个动作，打开一次相遇。"}
                    </h2>
                    <p>
                      {expired
                        ? "会话数据已清除，双方返回各自谱系。"
                        : result?.status === "rejected"
                          ? "没有计算或展示任何关系路径。修改双方选择后可重新尝试。"
                          : result?.status === "no-path"
                            ? "这不代表没有关系。可以调整双方共享类型与层数；系统不会猜测隐藏的关系。"
                            : "选择一位虚构用户，再分别设置双方愿意临时共享的范围。"}
                    </p>
                    {result && (
                      <button className="secondary" onClick={clearSession}>
                        结束会话
                      </button>
                    )}
                    <span className="empty-footnote">
                      <LockKeyhole size={14} />
                      临时授权 · 两分钟到期 · 随时结束
                    </span>
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "relations" && (
            <>
              <section className="card claim-form">
                <div>
                  <h2>发起关系认领</h2>
                  <p>
                    只是申请，不会立即建立关系；客观或法定身份不能通过此表单认证。
                  </p>
                </div>
                <div className="claim-fields">
                  <label className="field">
                    申请对象
                    <select
                      aria-label="认领对象"
                      value={claimTo}
                      onChange={(e) => setClaimTo(e.target.value)}
                    >
                      {people
                        .filter((p) => p.id !== actor)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    关系类型
                    <select
                      aria-label="认领关系类型"
                      value={claimKind}
                      onChange={(e) => setClaimKind(e.target.value as Kind)}
                    >
                      {Object.entries(kindNames).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={claimShare}
                      onChange={(e) => setClaimShare(e.target.checked)}
                    />
                    我允许此关系参与共享
                    <br />
                    （默认私密）
                  </label>
                  <button className="primary" onClick={() => send()}>
                    发送认领申请
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </section>
              <div className="two-columns">
                <section className="card">
                  <h2>
                    待我回应 <span className="count">{pending.length}</span>
                  </h2>
                  <p className="subtle">切换右上角身份，可扮演申请的接收方。</p>
                  {pending.length === 0 ? (
                    <p className="inline-empty">目前没有待处理申请。</p>
                  ) : (
                    pending.map((c) => (
                      <div className="request-item" key={c.id}>
                        <div className="flex items-center gap-3">
                          <Avatar id={c.from} />
                          <div>
                            <strong>{person(c.from).name}</strong>
                            <p>
                              申请确认{kindNames[c.kind]}关系 · 对方
                              {c.share ? "允许共享" : "设为私密"}
                            </p>
                          </div>
                        </div>
                        <label className="consent">
                          <input
                            type="checkbox"
                            checked={acceptShare[c.id] ?? false}
                            onChange={(e) =>
                              setAcceptShare({
                                ...acceptShare,
                                [c.id]: e.target.checked,
                              })
                            }
                          />
                          接受后，我也允许共享（否则私密）
                        </label>
                        <div className="flex gap-2">
                          <button
                            className="primary"
                            onClick={() =>
                              update(
                                respondClaim(
                                  state,
                                  actor,
                                  c.id,
                                  true,
                                  acceptShare[c.id] ?? false,
                                ),
                                "已由双方确认，隐私设置已生效。",
                              )
                            }
                          >
                            接受
                          </button>
                          <button
                            className="secondary"
                            onClick={() =>
                              update(
                                respondClaim(state, actor, c.id, false, false),
                                "已拒绝申请，未建立关系。",
                              )
                            }
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
                <section className="card">
                  <h2>我发出的申请</h2>
                  {state.claims.filter((c) => c.from === actor).length === 0 ? (
                    <p className="inline-empty">你还没有发起认领。</p>
                  ) : (
                    state.claims
                      .filter((c) => c.from === actor)
                      .map((c) => (
                        <div className="outgoing" key={c.id}>
                          <Avatar id={c.to} />
                          <div>
                            <strong>{person(c.to).name}</strong>
                            <p>
                              {kindNames[c.kind]} ·{" "}
                              {new Date(c.at).toLocaleDateString("zh-CN")}
                            </p>
                          </div>
                          <span className="status-badge">
                            {
                              {
                                pending: "等待对方确认",
                                accepted: "已接受",
                                rejected: "已拒绝",
                              }[c.status]
                            }
                          </span>
                        </div>
                      ))
                  )}
                </section>
              </div>
              <div className="section-title">
                <h2>关系生命周期</h2>
                <span>{own.length} 条有效直接关系</span>
              </div>
              <div className="relationship-grid">
                {own.map((e) => (
                  <article className="card relationship" key={e.id}>
                    <div className="flex items-center gap-3">
                      <Avatar id={other(e, actor)} />
                      <div>
                        <h3>{person(other(e, actor)).name}</h3>
                        <p>
                          {kindNames[e.kind]} ·{" "}
                          {e.objective
                            ? "客观 / 法定示例"
                            : "双方确认 · 自愿共同关系"}
                        </p>
                      </div>
                    </div>
                    <div className="relationship-status">
                      <span className="status-badge">
                        {e.fadedBy.some((id) => id === actor)
                          ? "我已淡化"
                          : "保持"}
                      </span>
                      <span className="status-badge muted">
                        {shared(e) ? "双方允许共享" : "私密 · 不参与寻路"}
                      </span>
                    </div>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={e.share[actor] ?? false}
                        onChange={(ev) =>
                          lifecycle(e, ev.target.checked ? "share" : "private")
                        }
                      />
                      允许我的这一侧参与共享
                    </label>
                    <p className="small-note">
                      对方设置：{e.share[other(e, actor)] ? "允许共享" : "私密"}
                      。修改仅影响自己的授权。
                    </p>
                    <div className="relation-actions">
                      <button
                        className="secondary"
                        onClick={() => lifecycle(e, "keep")}
                      >
                        保持
                      </button>
                      <button
                        className="secondary"
                        onClick={() => lifecycle(e, "fade")}
                      >
                        单方淡化
                      </button>
                      <button
                        className="danger-button"
                        disabled={e.objective}
                        onClick={() => lifecycle(e, "exit")}
                      >
                        单方退出
                      </button>
                    </div>
                    {e.objective && (
                      <p className="small-note">
                        <ShieldCheck size={14} />
                        客观关系独立保留，可关闭共享，不能退出删除。
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === "history" && (
            <section className="card history-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2>演示总历史</h2>
                  <p className="subtle">
                    包含所有模拟身份的变更；退出记录仍然保留。
                  </p>
                </div>
                <span className="status-badge">
                  {state.history.length} 条记录
                </span>
              </div>
              {state.history.length === 0 ? (
                <div className="empty-state small">
                  <History size={38} />
                  <h3>故事，正在开始。</h3>
                  <p>确认、拒绝、淡化、权限变更和退出都会记录在这里。</p>
                </div>
              ) : (
                <ol className="timeline">
                  {state.history.map((event) => (
                    <li key={event.id}>
                      <span className="timeline-dot" />
                      <time>{new Date(event.at).toLocaleString("zh-CN")}</time>
                      <h3>{person(event.actor).name}</h3>
                      <p>{event.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
          <footer>
            <span>全部人物与关系均为虚构，仅用于课程交互演示。</span>
            <span>算法只能发现连接，不能定义关系。</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {resetOpen && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <RotateCcw size={28} />
            <h2 id="reset-title">重置这次演示？</h2>
            <p>这会清除本机的认领、权限和历史记录，恢复初始虚构人物与关系。</p>
            <div className="flex gap-3 mt-6">
              <button
                autoFocus
                className="secondary"
                onClick={() => setResetOpen(false)}
              >
                取消
              </button>
              <button
                className="primary"
                onClick={() => {
                  setState(seed());
                  switchActor("lin");
                  setResetOpen(false);
                  setNotice("演示数据已恢复。");
                }}
              >
                确认重置
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
