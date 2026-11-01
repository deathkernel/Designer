"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, Check, CircleHelp, Clock3, FileCheck2, LoaderCircle, Plus, RefreshCw, Sparkles, Target, Users, WandSparkles } from "lucide-react";
import type { IntakeAnalysis, Project, ProjectIntake } from "@/lib/types";

type Props = {
  project: Project;
  onSave: (intake: ProjectIntake) => void;
  onApplyWorkstreams: (analysis: IntakeAnalysis) => void;
};

function priorityClass(priority: string) {
  return priority === "high" ? "intake-priority-high" : priority === "low" ? "intake-priority-low" : "intake-priority-medium";
}

export function AiProjectIntake({ project, onSave, onApplyWorkstreams }: Props) {
  const [idea, setIdea] = useState(project.intake?.idea ?? "");
  const [context, setContext] = useState(project.intake?.context ?? "");
  const [deadline, setDeadline] = useState(project.intake?.deadline ?? "");
  const [budget, setBudget] = useState(project.intake?.budget ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(project.intake?.answers ?? {});
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(project.intake?.analysis ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(project.intake?.updatedAt ?? "");

  useEffect(() => {
    setIdea(project.intake?.idea ?? "");
    setContext(project.intake?.context ?? "");
    setDeadline(project.intake?.deadline ?? "");
    setBudget(project.intake?.budget ?? "");
    setAnswers(project.intake?.answers ?? {});
    setAnalysis(project.intake?.analysis ?? null);
    setLastGenerated(project.intake?.updatedAt ?? "");
    setError("");
  }, [project.id, project.intake]);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (idea.trim().length < 20 || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          projectType: project.type,
          idea: idea.trim(),
          context: context.trim(),
          deadline,
          budget: budget.trim(),
          answers
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The project idea could not be analyzed.");
      const nextAnalysis = data.analysis as IntakeAnalysis;
      if (!nextAnalysis || typeof nextAnalysis.executiveSummary !== "string") {
        throw new Error("The model returned an incomplete project analysis. Please try again.");
      }
      const updatedAt = typeof data.generatedAt === "string" ? data.generatedAt : new Date().toISOString();
      setAnalysis(nextAnalysis);
      setLastGenerated(updatedAt);
      onSave({
        idea: idea.trim(),
        context: context.trim(),
        deadline,
        budget: budget.trim(),
        answers,
        analysis: nextAnalysis,
        updatedAt
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze this project.");
    } finally {
      setBusy(false);
    }
  }

  function updateAnswer(question: string, value: string) {
    setAnswers((current) => ({ ...current, [question]: value }));
  }

  const answeredCount = analysis?.openQuestions.filter((question) => answers[question.question]?.trim()).length ?? 0;

  return <section className="intake-card">
    <div className="intake-heading">
      <div className="intake-heading-icon"><WandSparkles size={17}/></div>
      <div className="intake-heading-copy">
        <div className="intake-eyebrow"><Sparkles size={11}/> LOCAL QWEN · PROJECT DISCOVERY</div>
        <h3>AI project intake</h3>
        <p>Explain the idea in your own words. Qwen will shape a first-pass plan and identify what still needs to be decided.</p>
      </div>
      <span className="intake-local-tag">Local AI</span>
    </div>

    <form className="intake-form" onSubmit={analyze}>
      <label className="intake-label" htmlFor="intake-idea">What are you trying to plan?</label>
      <textarea id="intake-idea" className="intake-textarea intake-idea" minLength={20} maxLength={10000} required value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Describe the idea, the problem it should solve, who it is for, what you want to achieve and anything you already know. It does not need to be perfectly structured."/>
      <div className="intake-character-count">{idea.length.toLocaleString()} / 10,000 characters · Minimum 20</div>
      <div className="intake-fields">
        <label className="intake-label">Target deadline <span>Optional</span><input type="date" className="intake-input" value={deadline} onChange={(event) => setDeadline(event.target.value)}/></label>
        <label className="intake-label">Budget or resource limit <span>Optional</span><input className="intake-input" maxLength={160} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="e.g. ₹50,000, 3 people, or not decided"/></label>
      </div>
      <label className="intake-label" htmlFor="intake-context">Extra context or known constraints <span>Optional</span></label>
      <textarea id="intake-context" className="intake-textarea intake-context" maxLength={4000} value={context} onChange={(event) => setContext(event.target.value)} placeholder="Relevant rules, location, stakeholders, available tools, resources, dependencies or constraints..."/>
      {error && <div className="intake-error"><AlertTriangle size={14}/><span>{error}</span></div>}
      <div className="intake-form-footer">
        <span><ShieldCheckIcon/> Sent to the Ollama endpoint configured for this workspace. This feature does not call a public AI API.</span>
        <button className="button button-primary" type="submit" disabled={busy || idea.trim().length < 20}>
          {busy ? <><LoaderCircle size={15} className="intake-spinner"/> Analyzing idea...</> : <><Sparkles size={15}/>{analysis ? "Re-analyze project" : "Analyze project idea"}</>}
        </button>
      </div>
    </form>

    {analysis && <div className="intake-results">
      <div className="intake-results-heading">
        <div><div className="intake-eyebrow">FIRST-PASS ANALYSIS</div><h4>Project discovery results</h4><p>Review assumptions and answer open questions before treating this as an approved plan.</p></div>
        <span className={"intake-confidence confidence-" + analysis.confidence}>{analysis.confidence} confidence</span>
      </div>
      <div className="intake-summary">
        <strong>{analysis.executiveSummary}</strong>
        <div className="intake-statement-grid">
          <div><span>PROBLEM TO SOLVE</span><p>{analysis.problemStatement}</p></div>
          <div><span>DESIRED OUTCOME</span><p>{analysis.desiredOutcome}</p></div>
        </div>
      </div>

      <div className="intake-section">
        <div className="intake-section-title"><Target size={15}/><h4>Objectives</h4><span>{analysis.objectives.length}</span></div>
        <div className="intake-objective-list">{analysis.objectives.map((item,index)=><article className="intake-objective" key={item.title + index}><b>{item.title}</b><p>{item.detail}</p><small><Check size={11}/> Success measure: {item.successMeasure}</small></article>)}</div>
      </div>

      <div className="intake-section">
        <div className="intake-section-title"><FileCheck2 size={15}/><h4>Deliverables</h4><span>{analysis.deliverables.length}</span></div>
        <div className="intake-deliverable-list">{analysis.deliverables.map((item,index)=><article className="intake-deliverable" key={item.title + index}><b>{item.title}</b><p>{item.description}</p>{item.acceptanceCriteria.length > 0 && <ul>{item.acceptanceCriteria.map((criterion,i)=><li key={i}>{criterion}</li>)}</ul>}</article>)}</div>
      </div>

      <div className="intake-section">
        <div className="intake-section-title"><LayersIcon/><h4>Workstreams</h4><span>{analysis.workstreams.length}</span></div>
        <div className="intake-workstream-list">{analysis.workstreams.map((stream,index)=><article className="intake-workstream" key={stream.title + index}><div><b>{stream.title}</b><p>{stream.goal}</p></div><ol>{stream.tasks.map((task,i)=><li key={i}>{task}</li>)}</ol></article>)}</div>
        {analysis.workstreams.length > 0 && <button type="button" className="button button-secondary intake-apply-button" onClick={() => onApplyWorkstreams(analysis)}><Plus size={14}/> Add suggested tasks to Work Breakdown</button>}
      </div>

      <div className="intake-two-column">
        <div className="intake-section">
          <div className="intake-section-title"><Users size={15}/><h4>Stakeholders</h4></div>
          <ul className="intake-simple-list">{analysis.stakeholders.map((item,index)=><li key={index}>{item}</li>)}</ul>
        </div>
        <div className="intake-section">
          <div className="intake-section-title"><Clock3 size={15}/><h4>Recommended next steps</h4></div>
          <ol className="intake-simple-list">{analysis.recommendedNextSteps.map((item,index)=><li key={index}>{item}</li>)}</ol>
        </div>
        <div className="intake-section">
          <div className="intake-section-title"><AlertTriangle size={15}/><h4>Risks to consider</h4></div>
          <div className="intake-risk-list">{analysis.risks.map((risk,index)=><article key={risk.title + index}><b>{risk.title}</b><p>{risk.mitigation}</p><small>Likelihood: {risk.likelihood} · Impact: {risk.impact}</small></article>)}</div>
        </div>
        <div className="intake-section">
          <div className="intake-section-title"><CircleHelp size={15}/><h4>Assumptions & constraints</h4></div>
          <div className="intake-pills">{analysis.assumptions.map((item,index)=><span key={"a"+index}>Assumption · {item}</span>)}{analysis.constraints.map((item,index)=><span key={"c"+index}>Constraint · {item}</span>)}</div>
        </div>
      </div>

      <div className="intake-section intake-questions">
        <div className="intake-section-title"><CircleHelp size={15}/><h4>Clarification questions</h4><span>{answeredCount}/{analysis.openQuestions.length} answered</span></div>
        <p className="intake-section-help">Answer what you know. Leave the rest blank; Qwen will keep unanswered items visible as open questions.</p>
        {analysis.openQuestions.map((question,index)=><label className="intake-question" key={question.question}>
          <span className="intake-question-top"><b>{index+1}. {question.question}</b><em className={priorityClass(question.priority)}>{question.priority} priority</em></span>
          {question.whyItMatters && <small>{question.whyItMatters}</small>}
          <textarea value={answers[question.question] ?? ""} onChange={(event)=>updateAnswer(question.question,event.target.value)} placeholder="Your answer (optional)"/>
        </label>)}
        {analysis.openQuestions.length === 0 && <p className="intake-section-help">No blocking clarification questions were identified in this pass.</p>}
        {analysis.openQuestions.length > 0 && <div className="intake-question-footer"><span>Answers are included the next time the plan is refined.</span><button type="button" className="button button-primary button-small" onClick={(event)=>{const form=event.currentTarget.closest(".intake-card")?.querySelector<HTMLFormElement>("form"); form?.requestSubmit();}} disabled={busy}><RefreshCw size={13}/> Refine with answers</button></div>}
      </div>

      {analysis.evidenceNeeded.length > 0 && <div className="intake-evidence"><b>Evidence to verify</b><ul>{analysis.evidenceNeeded.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
      {lastGenerated && <div className="intake-saved"><Check size={13}/> Analysis saved to this project · {new Date(lastGenerated).toLocaleString()}</div>}
    </div>}
  </section>;
}

function ShieldCheckIcon() {
  return <Check size={12}/>;
}

function LayersIcon() {
  return <Sparkles size={15}/>;
}
