import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CalendarDays, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { listApplications, listStudentAttendance, listStudentDocuments, listStudentInterviews, listStudentResults, uploadStudentDocument, withdrawApplication, type Application, type Attendance, type Interview, type PlacementResult } from './phase4Api';
import { InterviewPracticePanel } from '../phase6/AiCoaching';

type Kind = 'applications' | 'interviews' | 'attendance' | 'documents' | 'results';
export function StudentPhase4({ kind }: { kind: Kind }) {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docType, setDocType] = useState('OTHER');
  const loaders: Record<Kind, () => Promise<unknown[]>> = { applications: listApplications, interviews: listStudentInterviews, attendance: listStudentAttendance, documents: listStudentDocuments, results: listStudentResults };
  const load = () => { setLoading(true); loaders[kind]().then(setData).catch(() => setError('This information could not be loaded.')).finally(() => setLoading(false)); };
  useEffect(load, [kind]);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try { await uploadStudentDocument(file, docType); load(); } catch { setError('Document upload failed. Check the file type and size.'); setLoading(false); }
  }
  if (loading) return <div className="loading-screen"><RefreshCw size={19} /> Loading {kind}...</div>;
  return <section className="phase4-page">
    <div className="editor-heading"><p className="eyebrow">Student portal</p><h1>{kind[0].toUpperCase() + kind.slice(1)}<span>.</span></h1><p className="muted">Your personal placement lifecycle information.</p></div>
    {kind === 'documents' && <div className="document-upload"><select value={docType} onChange={(event) => setDocType(event.target.value)}><option>RESUME</option><option>TENTH_MARKSHEET</option><option>TWELFTH_MARKSHEET</option><option>SEMESTER_MARKSHEET</option><option>DEGREE_CERTIFICATE</option><option>INTERNSHIP_CERTIFICATE</option><option>OTHER</option></select><label className="dark-button upload-button">Upload document<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={upload} hidden /></label></div>}
    {error ? <div className="error-banner">{error}</div> : data.length ? <div className="phase4-list">{data.map((item, index) => <Phase4Row key={String((item as { _id?: string })._id ?? index)} kind={kind} item={item as never} onWithdraw={async (id) => { await withdrawApplication(id); load(); }} />)}</div> : <div className="standalone-empty"><div className="empty-icon"><CheckCircle2 /></div><p className="eyebrow">No records</p><h1>{kind === 'applications' ? 'No applications yet' : `No ${kind} to show`}<span>.</span></h1><p>Records will appear here when the Placement Center updates your placement journey.</p></div>}
  </section>;
}
function Phase4Row({ kind, item, onWithdraw }: { kind: Kind; item: Application | Interview | Attendance | PlacementResult | { _id: string; originalName?: string; type: string; status: string; createdAt: string }; onWithdraw: (id: string) => Promise<void> }) {
  if (kind === 'applications') {
    const application = item as Application;
    return <article className="phase4-row"><FileText size={20} /><span><b>{application.drive?.role ?? 'Placement drive'}</b><small>{application.drive?.company?.name ?? 'Company'} · Applied {new Date(application.appliedAt).toLocaleDateString()}</small></span><span className="status-badge status-active">{application.currentStage}</span>{!['REJECTED', 'WITHDRAWN', 'SELECTED'].includes(application.currentStage) && <button className="text-button" onClick={() => onWithdraw(application._id)}>Withdraw</button>}</article>;
  }
  if (kind === 'interviews') {
    const interview = item as Interview;
    return <article className="phase4-row"><CalendarDays size={20} /><span><b>{interview.selectionRoundName ?? interview.type}</b><small>{interview.drive?.role ?? 'Placement drive'} · {new Date(interview.date).toLocaleString()}</small></span><span className="status-badge status-published">{interview.status}</span><InterviewPracticePanel interviewId={interview._id} /></article>;
  }
  if (kind === 'attendance') {
    const attendance = item as Attendance;
    return <article className="phase4-row"><CheckCircle2 size={20} /><span><b>{attendance.interview?.selectionRoundName ?? 'Selection round'}</b><small>{attendance.interview?.date ? new Date(attendance.interview.date).toLocaleString() : 'Date unavailable'}</small></span><span className="status-badge status-active">{attendance.status}</span></article>;
  }
  if (kind === 'documents') {
    const document = item as { originalName?: string; type: string; status: string; createdAt: string };
    return <article className="phase4-row"><FileText size={20} /><span><b>{document.originalName ?? document.type}</b><small>{document.type} · {new Date(document.createdAt).toLocaleDateString()}</small></span><span className="status-badge status-active">{document.status}</span></article>;
  }
  const result = item as PlacementResult;
  return <article className="phase4-row"><CheckCircle2 size={20} /><span><b>{result.drive?.role ?? 'Placement result'}</b><small>{result.company?.name ?? 'Company'}{result.packageCtc ? ` · ${result.packageCtc}` : ''}</small></span><span className="status-badge status-published">{result.status}</span></article>;
}
