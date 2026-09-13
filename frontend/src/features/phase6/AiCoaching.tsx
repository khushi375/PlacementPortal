import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aiErrorState, requestEligibilityExplanation, requestInterviewPractice, requestResumeCoach, type AiSuggestion } from './aiApi';

const disclaimer = 'AI suggestions do not change eligibility, application status, or official placement decisions.';
const roundTypes = ['APTITUDE', 'CODING', 'TECHNICAL', 'GD', 'GROUP_DISCUSSION', 'HR'];

export function AiDisclaimer() {
  return <p className="ai-disclaimer">{disclaimer}</p>;
}

export function AiResult({ title, result, loading, error }: { title: string; result: AiSuggestion | null; loading: boolean; error: ReturnType<typeof aiErrorState> | null }) {
  if (loading) return <div className="ai-card"><Sparkles size={16} /> Preparing AI suggestions...</div>;
  if (error) return <div className={error.kind === 'unconfigured' ? 'error-banner' : 'error-banner'}>{error.message}</div>;
  if (!result) return null;
  return <article className="ai-card"><p className="eyebrow">AI suggestion</p><h3>{title}</h3><p>{result.suggestion ?? result.explanation}</p>{result.eligibility ? <small>Official eligibility remains {result.eligibility.status}.</small> : null}<AiDisclaimer /></article>;
}

function useAiAction<T>(action: (input: T) => Promise<AiSuggestion>) {
  const [result, setResult] = useState<AiSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReturnType<typeof aiErrorState> | null>(null);
  async function run(input: T) {
    setLoading(true); setError(null);
    try { setResult(await action(input)); } catch (caught) { setResult(null); setError(aiErrorState(caught)); } finally { setLoading(false); }
  }
  return { result, loading, error, run };
}

export function DriveAiActions({ driveId }: { driveId: string }) {
  const resume = useAiAction(requestResumeCoach);
  const eligibility = useAiAction(requestEligibilityExplanation);
  return <div className="ai-actions">
    <div className="ai-buttons">
      <button className="outline-button" type="button" disabled={resume.loading} onClick={() => resume.run(driveId)}>Resume Coach</button>
      <button className="outline-button" type="button" disabled={eligibility.loading} onClick={() => eligibility.run(driveId)}>Explain eligibility</button>
    </div>
    <AiResult title="Resume coaching" result={resume.result} loading={resume.loading} error={resume.error} />
    <AiResult title="Eligibility explanation" result={eligibility.result} loading={eligibility.loading} error={eligibility.error} />
  </div>;
}

export function InterviewPracticePanel({ interviewId, driveId }: { interviewId?: string; driveId?: string }) {
  const practice = useAiAction(requestInterviewPractice);
  const [roundType, setRoundType] = useState('TECHNICAL');
  const canRun = Boolean(interviewId || driveId);
  return <div className="ai-actions">
    {!interviewId && driveId ? <label className="select-field"><select value={roundType} onChange={(event) => setRoundType(event.target.value)}>{roundTypes.map((type) => <option key={type}>{type}</option>)}</select></label> : null}
    <button className="outline-button" type="button" disabled={!canRun || practice.loading} onClick={() => practice.run(interviewId ? { interviewId } : { driveId, roundType })}>Interview practice</button>
    {!canRun ? <p className="muted">Select a published drive or one of your interviews to generate practice questions.</p> : null}
    <AiResult title="Interview practice" result={practice.result} loading={practice.loading} error={practice.error} />
  </div>;
}
