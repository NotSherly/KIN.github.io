import { useState } from "react";
import { ArrowRight, ChevronDown, Route } from "lucide-react";

const journey = [
  { id: "graph", name: "从自己出发", hint: "点人物，展开谱系" },
  { id: "tap", name: "让关系空间相遇", hint: "碰一碰，发现路径" },
  { id: "relations", name: "由双方确认关系", hint: "申请、回应与权限" },
  { id: "history", name: "看见关系的变化", hint: "淡化、退出与历史" },
] as const;
export default function ExperienceGuide({ current, onNavigate }: { current: string; onNavigate: (tab: typeof journey[number]["id"]) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`experience-guide ${open ? "" : "collapsed"}`} aria-label="作品体验路线">
      <button className="guide-toggle" aria-expanded={open} aria-controls="experience-route" onClick={() => setOpen((value) => !value)}><Route size={16} /><span>初次体验 · 约 3 分钟</span><small>{open ? "收起引导" : "查看体验路线"}</small><ChevronDown size={15} /></button>
      {open && <div className="journey-steps" id="experience-route">{journey.map((step, index) => <button key={step.id} className={current === step.id ? "current" : ""} aria-current={current === step.id ? "step" : undefined} onClick={() => onNavigate(step.id)}><span className="journey-number">0{index + 1}</span><span><strong>{step.name}</strong><small>{step.hint}</small></span><ArrowRight size={15} /></button>)}</div>}
    </section>
  );
}
