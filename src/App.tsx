import { lazy, Suspense, useCallback, useEffect, useState } from "react";
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
  Users,
} from "lucide-react";
import PersonalNetwork from "./PersonalNetwork";
import ExperienceGuide from "./ExperienceGuide";
import {
  people,
  person,
  seed,
  decodeState,
  STORAGE_KEY,
  personalGraph,
  requestClaim,
  respondClaim,
  changeRelation,
  touches,
  other,
  shared,
  edgeLayer,
  kindNames,
  type State,
  type Kind,
  type Layer,
  type Edge,
} from "./model";

const TapExperience = lazy(() => import("./TapExperience"));

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
  const [tapVersion, setTapVersion] = useState(0);
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
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(t: Tab) {
    location.hash = t;
    setTab(t);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function clearSession() {
    setTapVersion((version) => version + 1);
  }
  function switchActor(id: string) {
    setNotice("");
    setActor(id);
    setSelected(id);
    setExpanded([id]);
    setLayer("all");
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
  const selectNode = useCallback((id: string) => {
    setSelected(id);
    if (layer !== "candidate")
      setExpanded((prev) => [...new Set([...prev, id])]);
  }, [layer]);
  function collapseBranch(id: string) {
    const next = expanded.filter((item) => item !== id);
    const visible = personalGraph(state, actor, next, layer).ids;
    setExpanded(next.filter((item) => visible.includes(item)));
    setSelected(id);
  }
  const visibleIds = layer === "candidate" ? [actor, ...candidates.map((p) => p.id)] : graph.ids;
  useEffect(() => {
    if (!visibleIds.includes(selected)) setSelected(actor);
  }, [visibleIds.join(","), selected, actor]);
  function lifecycle(edge: Edge, action: Parameters<typeof changeRelation>[3]) {
    update(
      changeRelation(state, actor, edge.id, action),
      action === "exit"
        ? "已退出共同关系，历史保留。"
        : "已更新自己的关系设置。",
    );
  }

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

          <ExperienceGuide current={tab} onNavigate={navigate} />

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
                          setExpanded([actor]);
                        }}
                      >
                        {layerNames[l]}
                      </button>
                    ))}
                  </div>
                  <PersonalNetwork
                    ids={visibleIds}
                    edges={layer === "candidate" ? candidateEdges : graph.edges}
                    actor={actor} selected={selected} expanded={expanded}
                    onSelect={selectNode} onCollapse={collapseBranch}
                    candidate={layer === "candidate"}
                    onReset={() => { setExpanded([actor]); setSelected(actor); }}
                  />
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
                    <span><i className="private-line" />私人直连</span>
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
            <Suspense fallback={<div className="card" role="status">正在准备碰一碰体验…</div>}>
              <TapExperience
                key={`${actor}-${tapVersion}`}
                actor={actor}
                state={state}
                onClaim={(id) => { setClaimTo(id); navigate("relations"); }}
              />
            </Suspense>
          )}

          {tab === "relations" && (
            <>
              <div className="relationship-intro">
                <ShieldCheck size={20} />
                <p><strong>发现路径之后，关系仍由彼此决定。</strong><span>申请、接受和各自的隐私授权，分别由对应的人操作。</span></p>
                {actor !== "lin" && <button className="secondary" onClick={() => switchActor("lin")}>回到林知夏<ArrowRight size={14} /></button>}
              </div>
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
                          {c.status === "pending" && (
                            <button className="secondary respond-as" onClick={() => switchActor(c.to)}>切换为对方并回应<ArrowRight size={14} /></button>
                          )}
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
                  <button className="secondary" onClick={() => navigate("relations")}>去体验关系管理<ArrowRight size={15} /></button>
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
          <details className="concept-note">
            <summary>关于《谱系 KIN》与这次设计</summary>
            <p>构想来自对福建宗族生活与传统族谱的观察：如果关系网络由每个人共同参与建立，我们该怎样发现连接，又怎样保留各自的边界？这个网页用虚构人物演示探索、临时共享、双方确认与关系变化。</p>
            <p>创作中，AI 协助梳理流程、对比方案和实现网页；构想与关键设计取舍由作者提出和判断。网页中的路径搜索只依据已授权的连接，不会自动定义或确认人与人的关系。</p>
          </details>
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
