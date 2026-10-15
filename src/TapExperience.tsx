import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clock3, HeartHandshake, Link2, LoaderCircle, LockKeyhole, Radio, ScanLine, ShieldCheck, Unplug, X } from "lucide-react";
import Graph from "./Graph";
import { findPath, kindNames, people, person, touches, type Kind, type Scope, type State } from "./model";

type Phase = "idle" | "approaching" | "paired" | "searching" | "found" | "rejected" | "no-path" | "expired" | "ended" | "error";
const initialScope = (): Scope => ({ types: ["family", "friend", "colleague"], depth: 3, consent: true });
const busyPhases: Phase[] = ["approaching", "paired", "searching"];
const phaseText: Record<Phase, [string, string]> = {
  idle: ["一次相遇，从彼此同意开始", "选择一位虚构用户，分别设置双方愿意临时共享的范围。"],
  approaching: ["让两个人的关系空间靠近", "正在模拟碰一碰，尚未展示任何关系。"],
  paired: ["临时配对成功", "只使用双方都同意共享的关系类型与层数。"],
  searching: ["正在寻找关系路径", "逐条检查连接的原有授权，不会绕过任何人的隐私设置。"],
  found: ["发现一条可见的连接路径", "这是一条系统推导路径，直接关系仍需双方另外确认。"],
  rejected: ["对方或你已拒绝授权", "本次未配对，也未进行关系路径搜索。双方都同意后才能继续。"],
  "no-path": ["当前授权范围内没有可见路径", "这不代表没有关系。可以调整共享范围，系统不会猜测隐藏的连接。"],
  expired: ["临时共享已到期", "本次路径已清除，各自的个人谱系保持独立。可以重新发起碰一碰。"],
  ended: ["临时共享已结束", "本次路径已清除，没有自动建立或合并任何关系。"],
  error: ["暂时无法完成这次配对", "请重新尝试。本次没有建立任何关系。"],
};

function ScopePicker({ id, title, value, onChange }: { id: string; title: string; value: Scope; onChange: (scope: Scope) => void }) {
  return (
    <fieldset className="scope">
      <legend>{title}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(kindNames) as Kind[]).map((kind) => (
          <label className="choice" key={kind}>
            <input type="checkbox" checked={value.types.includes(kind)} onChange={() => onChange({ ...value, types: value.types.includes(kind) ? value.types.filter((item) => item !== kind) : [...value.types, kind] })} />
            {kindNames[kind]}
          </label>
        ))}
      </div>
      <label className="field mt-4" htmlFor={`${id}-depth`}>最多共享几层
        <select id={`${id}-depth`} value={value.depth} onChange={(event) => onChange({ ...value, depth: Number(event.target.value) })}>
          {[1, 2, 3, 4, 5].map((depth) => <option key={depth} value={depth}>{depth} 层</option>)}
        </select>
      </label>
      <label className="consent"><input type="checkbox" checked={value.consent} onChange={(event) => onChange({ ...value, consent: event.target.checked })} />同意本次临时共享</label>
    </fieldset>
  );
}

// Abort every wait when a run is cancelled, replaced, or its page is unmounted.
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function PairingStage({ actor, target, scopeA, scopeB, phase, attempt, reduced }: { actor: string; target: string; scopeA: Scope; scopeB: Scope; phase: Phase; attempt: number; reduced: boolean }) {
  const paired = ["paired", "searching", "found", "no-path"].includes(phase);
  const busy = busyPhases.includes(phase);
  return (
    <div className={`pair-stage ${phase === "found" ? "compact" : ""}`} data-phase={phase} aria-label="模拟两位用户靠近配对">
      <div className="pair-bridge" aria-hidden="true" />
      {[{ id: actor, scope: scopeA }, { id: target, scope: scopeB }].map(({ id, scope }, index) => (
        <motion.article key={`${id}-${attempt}-${index}`} className="pair-phone"
          initial={reduced ? false : { opacity: 0, x: index ? 35 : -35, rotate: index ? 6 : -6 }}
          animate={{ opacity: 1, x: reduced ? 0 : paired || phase === "approaching" ? (index ? -10 : 10) : (index ? 9 : -9), rotate: reduced || paired || phase === "approaching" ? 0 : index ? 3 : -3 }}
          transition={{ duration: reduced ? 0.1 : phase === "approaching" ? 0.65 : 0.4, ease: "easeInOut" }}>
          <div className="phone-speaker" aria-hidden="true" />
          <span className="pair-avatar" style={{ background: person(id).color }}>{person(id).name.slice(-2)}</span>
          <strong>{person(id).name}</strong>
          <span className="pair-role">{index === 0 ? "当前的我" : "模拟对方"}</span>
          <span className={`pair-permission ${scope.consent ? "" : "declined"}`}>{scope.consent ? <ShieldCheck size={12} /> : <LockKeyhole size={12} />}{scope.consent ? `授权 ${scope.depth} 层` : "未同意共享"}</span>
        </motion.article>
      ))}
      <div className="pair-signal" aria-hidden="true">
        <AnimatePresence>
          {busy && !reduced && [0, 1].map((ring) => <motion.i key={`${attempt}-${ring}`} className="pair-ripple" initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 2.8, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.1, delay: ring * 0.4, repeat: Infinity, ease: "easeOut" }} />)}
        </AnimatePresence>
        <span>{phase === "rejected" ? <X size={21} /> : phase === "searching" ? <LoaderCircle className="loading-icon" size={21} /> : paired ? <Link2 size={21} /> : phase === "expired" || phase === "ended" ? <Unplug size={21} /> : <Radio size={21} />}</span>
      </div>
      <span className="pair-stage-caption">{paired ? "双方临时授权 · 个人谱系保持独立" : "虚构用户 · 模拟碰一碰"}</span>
    </div>
  );
}

export default function TapExperience({ actor, state, onClaim }: { actor: string; state: State; onClaim: (id: string) => void }) {
  const reduced = Boolean(useReducedMotion());
  const [target, setTarget] = useState(actor === "chen" ? "lin" : "chen");
  const [scopeA, setScopeA] = useState(initialScope);
  const [scopeB, setScopeB] = useState(initialScope);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ReturnType<typeof findPath> | null>(null);
  const [reveal, setReveal] = useState(1);
  const [expires, setExpires] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const scene = useRef<HTMLElement>(null);
  const busy = busyPhases.includes(phase);
  function reset(nextPhase: Phase = "idle") {
    setAttempt(0); setPhase(nextPhase); setResult(null); setReveal(1); setExpires(null);
  }
  function start() {
    setResult(null); setReveal(1); setExpires(null); setAttempt((run) => run + 1);
    scene.current?.scrollIntoView({ block: "start", behavior: reduced ? "instant" : "smooth" });
  }

  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    const signal = controller.signal;
    async function run() {
      if (!scopeA.consent || !scopeB.consent) { setPhase("rejected"); return; }
      try {
        setPhase("approaching");
        await wait(reduced ? 80 : 750, signal);
        setPhase("paired");
        const pairedAt = Date.now();
        setExpires(pairedAt + 120000); setNow(pairedAt);
        await wait(reduced ? 80 : 550, signal);
        setPhase("searching");
        await wait(reduced ? 120 : 750, signal);
        const next = findPath(state, actor, target, scopeA, scopeB);
        setResult(next);
        setPhase(next.status);
      } catch {
        if (!signal.aborted) { setPhase("error"); setExpires(null); setResult(null); }
      }
    }
    void run();
    return () => controller.abort();
    // Scope controls reset the run before changing their value; actor/state changes remount this view.
  }, [attempt]);
  useEffect(() => {
    if (!expires) return;
    const tick = () => {
      const time = Date.now(); setNow(time);
      if (time >= expires) reset("expired");
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expires]);
  useEffect(() => {
    if (phase !== "found" || !result || reveal >= result.ids.length) return;
    const timer = setTimeout(() => setReveal((count) => count + 1), reduced ? 80 : 600);
    return () => clearTimeout(timer);
  }, [phase, result, reveal, reduced]);

  const routeClaimExists = state.edges.some((edge) => edge.status === "active" && touches(edge, actor) && touches(edge, target)) || state.claims.some((claim) => claim.status === "pending" && [claim.from, claim.to].includes(actor as typeof claim.from) && [claim.from, claim.to].includes(target as typeof claim.to));
  const step = phase === "approaching" ? 0 : phase === "paired" ? 1 : phase === "searching" ? 2 : phase === "found" || phase === "no-path" ? 3 : -1;
  function preset(kind: "success" | "no-path" | "rejected") {
    reset(); setScopeA(initialScope()); setScopeB({ ...initialScope(), consent: kind !== "rejected" });
    setTarget(kind === "no-path" ? (actor === "su" ? "chen" : "su") : actor === "chen" ? "lin" : "chen");
  }
  return (
    <div className="tap-layout">
      <section className="card tap-controls">
        <div className="section-kicker"><ScanLine size={19} />建立临时共享</div>
        <p className="tap-intro">分别决定愿意分享什么，再让两个关系空间相遇。</p>
        <div className="tap-presets" aria-label="体验示例">
          <button onClick={() => preset("success")}>默认示例</button><button onClick={() => preset("no-path")}>试试无路径</button><button onClick={() => preset("rejected")}>试试拒绝</button>
        </div>
        <label className="field">另一位模拟用户
          <select aria-label="碰一碰对象" value={target} onChange={(event) => { reset(); setTarget(event.target.value); }}>
            {people.filter((p) => p.id !== actor).map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === "su" ? "（独立节点）" : ""}</option>)}
          </select>
        </label>
        <ScopePicker id="mine" title={`${person(actor).name}的选择`} value={scopeA} onChange={(value) => { reset(); setScopeA(value); }} />
        <ScopePicker id="theirs" title={`${person(target).name}的选择（模拟对方）`} value={scopeB} onChange={(value) => { reset(); setScopeB(value); }} />
        <p className="scope-explanation">类型取双方交集，层数取较小值。沿途每条连接还需原关系双方授权。修改设置会结束当前会话。</p>
        <button className="primary w-full" disabled={busy} onClick={start}>{busy ? <LoaderCircle className="loading-icon" size={18} /> : <ScanLine size={18} />}{busy ? "正在模拟碰一碰…" : "开始模拟碰一碰"}</button>
      </section>
      <section ref={scene} className="graph-card session-card" aria-busy={busy}>
        <div className="graph-heading"><div><h2>这一次，我们如何相连？</h2><p>配对只用于本次发现，不会合并个人谱系。</p></div>{expires && <span className="timer"><Clock3 size={15} />{Math.max(0, Math.ceil((expires - now) / 1000))} 秒</span>}</div>
        <PairingStage actor={actor} target={target} scopeA={scopeA} scopeB={scopeB} phase={phase} attempt={attempt} reduced={reduced} />
        <ol className="pair-steps" aria-label="本次配对进度">{["靠近", "临时配对", "授权寻路"].map((label, index) => <li key={label} className={step > index ? "done" : step === index ? "current" : ""}><span>{step > index ? <Check size={12} /> : index + 1}</span>{label}</li>)}</ol>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={phase} className={`tap-feedback ${["rejected", "no-path", "expired", "error"].includes(phase) ? "attention" : ""}`} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0.05 : 0.15 }} role="status" aria-live="polite">
            <h3>{phaseText[phase][0]}</h3><p>{phaseText[phase][1]}</p>
          </motion.div>
        </AnimatePresence>
        {phase === "found" && result?.status === "found" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0.05 : 0.3 }}>
            <div className="result-banner"><ShieldCheck size={17} />发现 {result.edges.length} 层可见路径<span>系统推导 · 非双方直接确认</span></div>
            <div className="session-graph"><Graph ids={result.ids.slice(0, reveal)} edges={result.edges} actor={actor} path /></div>
            <div className="path-text" aria-live="polite">{result.ids.slice(0, reveal).map((id) => person(id).name).join(" → ")}{reveal < result.ids.length && <span> · 正在展开…</span>}</div>
            <div className="session-actions"><button className="primary" disabled={routeClaimExists || reveal < result.ids.length} onClick={() => onClaim(target)}><HeartHandshake size={16} />{routeClaimExists ? "已有直接关系或待处理申请" : "可选：申请直接关系认领"}</button><button className="secondary" onClick={() => reset("ended")}>结束临时共享</button></div>
          </motion.div>
        )}
        {busy && <div className="session-actions"><button className="secondary" onClick={() => reset("ended")}><X size={15} />取消本次配对</button></div>}
        {["no-path", "rejected", "expired", "error"].includes(phase) && <div className="session-actions"><button className="secondary" onClick={() => reset()}>调整后重新体验<ArrowRight size={15} /></button></div>}
        <p className="tap-boundary"><LockKeyhole size={14} />两分钟临时共享 · 随时结束 · 离开本页即清除路径</p>
      </section>
    </div>
  );
}
