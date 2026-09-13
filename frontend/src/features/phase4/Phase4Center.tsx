import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, CalendarDays, ChevronLeft, FileText, Plus, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/studentApi';
import { attendanceStatuses, documentReviewStatuses, getPlacementApplication, interviewStatuses, listPlacementApplications, listPlacementAttendance, listPlacementDocuments, listPlacementInterviews, markInterviewAttendance, messageFromError, reviewPlacementDocument, scheduleInterview, updateInterviewStatus, updateApplicationStatus, type Application, type Attendance, type Interview, type PlacementApplicationDetail, type PlacementDocument } from './phase4Api';

type Section = 'applications' | 'interviews' | 'attendance' | 'documents' | 'results';
export function Phase4Center({ section }: { section: Section }) {
  if (section === 'interviews') return <InterviewsWorkspace />;
  if (section === 'attendance') return <AttendanceWorkspace />;
  if (section === 'documents') return <DocumentsWorkspace />;
  return <RecordsWorkspace section={section} />;
}
function RecordsWorkspace({ section }: { section: 'applications' | 'results' }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const load = () => {
    setLoading(true);
    setError('');
    const request = section === 'applications' ? listPlacementApplications() : api.get<{ data: { items?: unknown[] } | unknown[] }>(`/placement/${section}`).then((response) => {
      const data = response.data.data;
      return Array.isArray(data) ? data : data.items ?? [];
    });
    request.then(setItems).catch(() => setError('Operational records could not be loaded.')).finally(() => setLoading(false));
  };
  useEffect(() => { setDetailId(null); load(); }, [section]);
  if (section === 'applications' && detailId) return <ApplicationDetails id={detailId} back={() => { setDetailId(null); load(); }} />;
  if (loading) return <div className="loading-screen"><RefreshCw size={18} /> Loading {section}...</div>;
  return <section className="phase4-page"><div className="editor-heading"><p className="eyebrow">Placement Center</p><h1>{section[0].toUpperCase() + section.slice(1)}<span>.</span></h1><p className="muted">Backend-connected Phase 4 operations workspace.</p></div>{error ? <div className="error-banner">{error}</div> : items.length ? <div className="phase4-list">{items.map((item, index) => <CenterRow key={String((item as { _id?: string })._id ?? index)} section={section} item={item as Record<string, unknown>} open={() => setDetailId(String((item as { _id: string })._id))} />)}</div> : <div className="standalone-empty"><div className="empty-icon"><CheckCircle2 /></div><p className="eyebrow">No records</p><h1>No {section} yet<span>.</span></h1><p>Operational records will appear here when created through the placement workflow.</p></div>}</section>;
}
function CenterRow({ section, item, open }: { section: Section; item: Record<string, unknown>; open: () => void }) {
  if (section === 'applications') {
    const application = item as unknown as Application;
    return <article className="phase4-row"><FileText size={19} /><span><b>{application.student?.user?.displayName ?? application.student?.rollNumber ?? 'Student'}</b><small>{application.drive?.role ?? 'Placement drive'} · {application.drive?.company?.name ?? 'Company'} · Applied {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : 'date unavailable'}</small></span><span className="status-badge status-active">{application.currentStage}</span><button className="text-button" onClick={open}>Details</button></article>;
  }
  const drive = item.drive as { role?: string } | undefined;
  const company = item.company as { name?: string } | undefined;
  return <article className="phase4-row">{section === 'interviews' ? <CalendarDays size={19} /> : section === 'documents' ? <FileText size={19} /> : <CheckCircle2 size={19} />}<span><b>{String(drive?.role ?? company?.name ?? item.selectionRoundName ?? item.type ?? 'Operational record')}</b><small>{String(item.currentStage ?? item.status ?? item.originalName ?? 'Details available')}</small></span><span className="status-badge status-active">{String(item.currentStage ?? item.status ?? 'OPEN')}</span></article>;
}
function ApplicationDetails({ id, back }: { id: string; back: () => void }) {
  const [application, setApplication] = useState<PlacementApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const load = () => {
    setLoading(true);
    getPlacementApplication(id).then((result) => { setApplication(result); setError(''); }).catch((caught) => setError(messageFromError(caught, 'Application details could not be loaded.'))).finally(() => setLoading(false));
  };
  useEffect(load, [id]);
  async function changeStatus(status: string) {
    setUpdating(true); setError(''); setSuccess('');
    try {
      const extra = note.trim() ? { note: note.trim(), ...(status === 'REJECTED' ? { rejectionReason: note.trim() } : {}) } : undefined;
      const updated = await updateApplicationStatus(id, status, extra);
      setApplication(updated);
      setNote('');
      setSuccess(`Application status updated to ${updated.currentStage}.`);
    } catch (caught) {
      setError(messageFromError(caught, 'The status update could not be completed.'));
    } finally {
      setUpdating(false);
    }
  }
  if (loading) return <div className="loading-rows">Loading application details...</div>;
  if (error && !application) return <><button className="outline-button back-button" onClick={back}><ChevronLeft size={16} /> Applications</button><div className="error-banner">{error}</div></>;
  if (!application) return <><button className="outline-button back-button" onClick={back}><ChevronLeft size={16} /> Applications</button><div className="standalone-empty"><div className="empty-icon"><CheckCircle2 /></div><p className="eyebrow">Missing record</p><h1>Application not found<span>.</span></h1><p>This application is unavailable or was removed.</p></div></>;
  const student = application.student;
  const drive = application.drive;
  const eligibility = application.eligibility;
  const value = (input?: string | number | null) => input === undefined || input === null || input === '' ? 'Not available' : String(input);
  return <section>
    <button className="outline-button back-button" onClick={back}><ChevronLeft size={16} /> Applications</button>
    <div className="page-heading"><div><p className="eyebrow">Application details</p><h1>{student?.user?.displayName ?? student?.rollNumber ?? 'Student'}<span>.</span></h1></div><span className="status-badge status-active">{application.currentStage}</span></div>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    <div className="detail-layout">
      <section className="panel detail-panel">
        <p className="eyebrow">Student</p>
        <h2>{student?.user?.displayName ?? 'Student details unavailable'}</h2>
        <p>{student?.user?.email ?? 'Email not available'}</p>
        <dl>
          <dt>Roll number</dt><dd>{value(student?.rollNumber)}</dd>
          <dt>Course</dt><dd>{value(student?.course?.name)}</dd>
          <dt>Department</dt><dd>{value(student?.department?.name)}</dd>
          <dt>Batch</dt><dd>{value(student?.batch?.year)}</dd>
          <dt>CGPA</dt><dd>{value(student?.cgpa)}</dd>
          <dt>10th / 12th</dt><dd>{student?.tenthPercentage ?? '—'}% / {student?.twelfthPercentage ?? '—'}%</dd>
          <dt>Backlogs</dt><dd>{student?.activeBacklogs ?? '—'} active, {student?.backlogs ?? '—'} total</dd>
        </dl>
        <p className="eyebrow detail-label">Application</p>
        <dl>
          <dt>Applied</dt><dd>{application.appliedAt ? new Date(application.appliedAt).toLocaleString() : 'Not available'}</dd>
          <dt>Status</dt><dd>{application.currentStage}</dd>
          <dt>Resume</dt><dd>{application.resume?.filename ?? 'No resume on file'}</dd>
          <dt>Resume status</dt><dd>{application.resume?.status ?? 'Not available'}</dd>
          <dt>Notes</dt><dd>{application.notes ?? 'No notes'}</dd>
          <dt>Rejection</dt><dd>{application.rejectionReason ?? 'Not recorded'}</dd>
        </dl>
      </section>
      <section className="panel detail-panel">
        <p className="eyebrow">Drive</p>
        <h2>{drive?.role ?? 'Drive details unavailable'}</h2>
        <p>{drive?.company?.name ?? 'Company not available'} · {drive?.company?.industry ?? 'Industry not added'}</p>
        <dl>
          <dt>Website</dt><dd>{value(drive?.company?.website)}</dd>
          <dt>Location</dt><dd>{value(drive?.location)}</dd>
          <dt>Work mode</dt><dd>{value(drive?.workMode)}</dd>
          <dt>Deadline</dt><dd>{drive?.applicationDeadline ? new Date(drive.applicationDeadline).toLocaleString() : 'Not available'}</dd>
        </dl>
        <p className="eyebrow detail-label">Eligibility</p>
        {eligibility ? <>
          <span className={`eligibility-tag ${eligibility.status.toLowerCase()}`}>{eligibility.status.replaceAll('_', ' ')}</span>
          {eligibility.reasons.length ? <ul className="criteria-list">{eligibility.reasons.map((reason) => <li key={reason.rule}>{reason.rule}: {reason.message}</li>)}</ul> : <p>No eligibility checks were returned for this application.</p>}
        </> : <p>Eligibility information is not available for this application.</p>}
      </section>
    </div>
    <section className="panel eligible-panel">
      <div className="panel-heading"><div><p className="eyebrow">Controlled status actions</p><h2>Allowed transitions</h2></div></div>
      <p className="muted">Buttons reflect only the transitions returned by the backend for the current status.</p>
      <label className="status-note">Optional note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a review note or rejection reason" /></label>
      {application.allowedTransitions.length ? <div className="status-actions">{application.allowedTransitions.map((status) => <button className="dark-button" disabled={updating} key={status} onClick={() => changeStatus(status)}>{status.replaceAll('_', ' ')}</button>)}</div> : <p>No further status changes are allowed for this application.</p>}
    </section>
  </section>;
}
function InterviewsWorkspace() {
  const [items, setItems] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detail, setDetail] = useState<Interview | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const load = () => { setLoading(true); listPlacementInterviews().then(setItems).catch((caught) => setError(messageFromError(caught, 'Interviews could not be loaded.'))).finally(() => setLoading(false)); };
  useEffect(load, []);
  if (detail) return <InterviewDetails interview={detail} back={() => { setDetail(null); load(); }} />;
  if (loading) return <div className="loading-rows">Loading interviews...</div>;
  return <section className="phase4-page">
    <div className="page-heading"><div><p className="eyebrow">Placement Center</p><h1>Interviews<span>.</span></h1></div><button className="dark-button" onClick={() => setScheduling(true)}><Plus size={16} /> Schedule interview</button></div>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    {items.length ? <div className="phase4-list">{items.map((item) => <article className="phase4-row" key={item._id}><CalendarDays size={19} /><span><b>{item.application?.student?.user?.displayName ?? item.application?.student?.rollNumber ?? 'Student'}</b><small>{item.selectionRoundName ?? item.type} · {item.drive?.role ?? 'Drive'} · {item.date ? new Date(item.date).toLocaleString() : 'Date unavailable'}</small></span><span className="status-badge status-active">{item.status}</span><button className="text-button" onClick={() => setDetail(item)}>Details</button></article>)}</div> : <div className="standalone-empty"><div className="empty-icon"><CalendarDays /></div><p className="eyebrow">No records</p><h1>No interviews yet<span>.</span></h1><p>Schedule an interview against an existing application to begin this workflow.</p></div>}
    {scheduling && <ScheduleInterviewDialog close={() => setScheduling(false)} saved={() => { setScheduling(false); setSuccess('Interview scheduled.'); load(); }} />}
  </section>;
}
function InterviewDetails({ interview, back }: { interview: Interview; back: () => void }) {
  const [current, setCurrent] = useState(interview);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  async function changeStatus(status: string) {
    setUpdating(true); setError(''); setSuccess('');
    try { setCurrent(await updateInterviewStatus(current._id, status)); setSuccess(`Interview status updated to ${status}.`); }
    catch (caught) { setError(messageFromError(caught, 'The interview status could not be updated.')); }
    finally { setUpdating(false); }
  }
  const student = current.application?.student;
  const value = (input?: string | number | null) => input === undefined || input === null || input === '' ? 'Not available' : String(input);
  return <section>
    <button className="outline-button back-button" onClick={back}><ChevronLeft size={16} /> Interviews</button>
    <div className="page-heading"><div><p className="eyebrow">Interview details</p><h1>{current.selectionRoundName ?? current.type}<span>.</span></h1></div><span className="status-badge status-active">{current.status}</span></div>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    <div className="detail-layout">
      <section className="panel detail-panel">
        <p className="eyebrow">Student</p>
        <h2>{student?.user?.displayName ?? 'Student details unavailable'}</h2>
        <p>{student?.user?.email ?? 'Email not available'}</p>
        <dl><dt>Roll number</dt><dd>{value(student?.rollNumber)}</dd><dt>Application</dt><dd>{value(current.application?.currentStage)}</dd></dl>
      </section>
      <section className="panel detail-panel">
        <p className="eyebrow">Schedule</p>
        <h2>{current.drive?.role ?? 'Drive unavailable'}</h2>
        <p>{current.drive?.company?.name ?? 'Company not available'}</p>
        <dl>
          <dt>Date</dt><dd>{current.date ? new Date(current.date).toLocaleString() : 'Not available'}</dd>
          <dt>Start</dt><dd>{current.startTime ? new Date(current.startTime).toLocaleString() : 'Not available'}</dd>
          <dt>End</dt><dd>{current.endTime ? new Date(current.endTime).toLocaleString() : 'Not available'}</dd>
          <dt>Mode</dt><dd>{value(current.mode)}</dd>
          <dt>Venue / link</dt><dd>{value(current.venueOrLink)}</dd>
          <dt>Instructions</dt><dd>{value(current.instructions)}</dd>
        </dl>
      </section>
    </div>
    <section className="panel eligible-panel">
      <div className="panel-heading"><div><p className="eyebrow">Interview status</p><h2>Allowed actions</h2></div></div>
      <p className="muted">Actions use the interview statuses already defined by the backend API.</p>
      <div className="status-actions">{interviewStatuses.filter((status) => status !== current.status).map((status) => <button className="dark-button" disabled={updating} key={status} onClick={() => changeStatus(status)}>{status.replaceAll('_', ' ')}</button>)}</div>
    </section>
  </section>;
}
function ScheduleInterviewDialog({ close, saved }: { close: () => void; saved: () => void }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ application: '', type: 'TECHNICAL', date: '', startTime: '', endTime: '', mode: 'ONLINE', venueOrLink: '', instructions: '', selectionRoundName: '', selectionRoundOrder: '' });
  useEffect(() => { listPlacementApplications().then(setApplications).catch((caught) => setError(messageFromError(caught, 'Applications could not be loaded.'))); }, []);
  const selected = applications.find((item) => item._id === form.application);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected?.drive?._id) { setError('Select an application that belongs to a placement drive.'); return; }
    setError('');
    try {
      await scheduleInterview({
        application: form.application,
        drive: selected.drive._id,
        type: form.type,
        date: new Date(form.date).toISOString(),
        mode: form.mode,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        venueOrLink: form.venueOrLink || undefined,
        instructions: form.instructions || undefined,
        selectionRoundName: form.selectionRoundName || undefined,
        selectionRoundOrder: form.selectionRoundOrder ? Number(form.selectionRoundOrder) : undefined,
      });
      saved();
    } catch (caught) {
      setError(messageFromError(caught, 'The interview could not be scheduled.'));
    }
  }
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop"><div className="modal wide-modal"><div className="modal-heading"><h2>Schedule interview</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={18} /></button></div>
    {error && <div className="error-banner">{error}</div>}
    <form className="modal-form" onSubmit={submit}>
      <label>Application<select required value={form.application} onChange={(event) => set('application', event.target.value)}><option value="">Select application</option>{applications.map((item) => <option key={item._id} value={item._id}>{item.student?.user?.displayName ?? item.student?.rollNumber ?? 'Student'} · {item.drive?.role ?? 'Drive'} · {item.currentStage}</option>)}</select></label>
      <div className="form-row"><label>Round name<input value={form.selectionRoundName} onChange={(event) => set('selectionRoundName', event.target.value)} /></label><label>Round order<input type="number" min="1" value={form.selectionRoundOrder} onChange={(event) => set('selectionRoundOrder', event.target.value)} /></label></div>
      <div className="form-row"><label>Type<select value={form.type} onChange={(event) => set('type', event.target.value)}><option>APTITUDE</option><option>CODING</option><option>TECHNICAL</option><option>GROUP_DISCUSSION</option><option>HR</option><option>FINAL_INTERVIEW</option><option>CUSTOM</option></select></label><label>Mode<select value={form.mode} onChange={(event) => set('mode', event.target.value)}><option>ONLINE</option><option>OFFLINE</option><option>HYBRID</option></select></label></div>
      <div className="form-row"><label>Date and time<input required type="datetime-local" value={form.date} onChange={(event) => set('date', event.target.value)} /></label><label>Venue or link<input value={form.venueOrLink} onChange={(event) => set('venueOrLink', event.target.value)} /></label></div>
      <div className="form-row"><label>Start<input type="datetime-local" value={form.startTime} onChange={(event) => set('startTime', event.target.value)} /></label><label>End<input type="datetime-local" value={form.endTime} onChange={(event) => set('endTime', event.target.value)} /></label></div>
      <label>Instructions<textarea value={form.instructions} onChange={(event) => set('instructions', event.target.value)} /></label>
      <div className="modal-actions"><button type="button" className="outline-button" onClick={close}>Cancel</button><button className="dark-button">Schedule interview</button></div>
    </form>
  </div></div>;
}
function AttendanceWorkspace() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState('');
  const load = () => { setLoading(true); Promise.all([listPlacementInterviews(), listPlacementAttendance()]).then(([nextInterviews, nextRecords]) => { setInterviews(nextInterviews); setRecords(nextRecords); }).catch((caught) => setError(messageFromError(caught, 'Attendance records could not be loaded.'))).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function mark(interview: Interview, status: string) {
    const studentId = interview.application?.student?._id;
    if (!studentId) { setError('This interview has no assigned student, so attendance cannot be marked.'); return; }
    setUpdating(interview._id); setError(''); setSuccess('');
    try {
      const updated = await markInterviewAttendance(interview._id, studentId, status, remarks.trim() || undefined);
      setRecords((current) => {
        const interviewId = typeof updated.interview === 'object' && updated.interview ? updated.interview._id : interview._id;
        const remaining = current.filter((item) => (typeof item.interview === 'object' && item.interview ? item.interview._id : item.interview) !== interviewId);
        return [updated, ...remaining];
      });
      setSuccess(`Attendance marked ${status} for ${interview.application?.student?.user?.displayName ?? 'the student'}.`);
      setRemarks('');
    } catch (caught) {
      setError(messageFromError(caught, 'Attendance could not be updated.'));
    } finally {
      setUpdating('');
    }
  }
  if (loading) return <div className="loading-rows">Loading attendance...</div>;
  const statusFor = (id: string) => records.find((item) => (typeof item.interview === 'object' && item.interview ? item.interview._id : item.interview) === id)?.status ?? 'NOT_MARKED';
  return <section className="phase4-page">
    <div className="editor-heading"><p className="eyebrow">Placement Center</p><h1>Attendance<span>.</span></h1><p className="muted">Mark attendance for scheduled interviews using the existing backend rules.</p></div>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    <label className="status-note">Optional remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add remarks for the next attendance update" /></label>
    {interviews.length ? <div className="phase4-list">{interviews.map((item) => <article className="phase4-row attendance-row" key={item._id}><CheckCircle2 size={19} /><span><b>{item.application?.student?.user?.displayName ?? item.application?.student?.rollNumber ?? 'Student'}</b><small>{item.selectionRoundName ?? item.type} · {item.drive?.role ?? 'Drive'} · {item.date ? new Date(item.date).toLocaleString() : 'Date unavailable'}</small></span><span className="status-badge status-active">{statusFor(item._id)}</span><div className="status-actions">{attendanceStatuses.map((status) => <button className="outline-button" disabled={updating === item._id} key={status} onClick={() => mark(item, status)}>{status.replaceAll('_', ' ')}</button>)}</div></article>)}</div> : <div className="standalone-empty"><div className="empty-icon"><CheckCircle2 /></div><p className="eyebrow">No records</p><h1>No interviews to mark<span>.</span></h1><p>Attendance can be marked after interviews are scheduled.</p></div>}
  </section>;
}
function DocumentsWorkspace() {
  const [items, setItems] = useState<PlacementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<PlacementDocument | null>(null);
  const load = () => { setLoading(true); listPlacementDocuments().then(setItems).catch((caught) => setError(messageFromError(caught, 'Documents could not be loaded.'))).finally(() => setLoading(false)); };
  useEffect(load, []);
  if (detail) return <DocumentDetails document={detail} back={() => { setDetail(null); load(); }} />;
  if (loading) return <div className="loading-rows">Loading documents...</div>;
  return <section className="phase4-page">
    <div className="editor-heading"><p className="eyebrow">Placement Center</p><h1>Documents<span>.</span></h1><p className="muted">Student documents stored through the existing secure upload workflow.</p></div>
    {error && <div className="error-banner">{error}</div>}
    {items.length ? <div className="phase4-list">{items.map((item) => <article className="phase4-row" key={item._id}><FileText size={19} /><span><b>{item.originalName ?? item.type}</b><small>{item.student?.user?.displayName ?? item.student?.rollNumber ?? 'Student'} · {item.type} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Date unavailable'}</small></span><span className="status-badge status-active">{item.status}</span><button className="text-button" onClick={() => setDetail(item)}>Details</button></article>)}</div> : <div className="standalone-empty"><div className="empty-icon"><FileText /></div><p className="eyebrow">No records</p><h1>No documents yet<span>.</span></h1><p>Documents will appear here when students upload files from the student portal.</p></div>}
  </section>;
}
function DocumentDetails({ document, back }: { document: PlacementDocument; back: () => void }) {
  const [current, setCurrent] = useState(document);
  const [comment, setComment] = useState(document.reviewComment ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  async function review(status: string) {
    setUpdating(true); setError(''); setSuccess('');
    try { const updated = await reviewPlacementDocument(current._id, status, comment.trim() || undefined); setCurrent(updated); setSuccess(`Document status updated to ${status}.`); }
    catch (caught) { setError(messageFromError(caught, 'The document could not be reviewed.')); }
    finally { setUpdating(false); }
  }
  const value = (input?: string | number | null) => input === undefined || input === null || input === '' ? 'Not available' : String(input);
  return <section>
    <button className="outline-button back-button" onClick={back}><ChevronLeft size={16} /> Documents</button>
    <div className="page-heading"><div><p className="eyebrow">Document details</p><h1>{current.originalName ?? current.type}<span>.</span></h1></div><span className="status-badge status-active">{current.status}</span></div>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    <div className="detail-layout">
      <section className="panel detail-panel">
        <p className="eyebrow">Student</p>
        <h2>{current.student?.user?.displayName ?? 'Student details unavailable'}</h2>
        <p>{current.student?.user?.email ?? 'Email not available'}</p>
        <dl><dt>Roll number</dt><dd>{value(current.student?.rollNumber)}</dd></dl>
      </section>
      <section className="panel detail-panel">
        <p className="eyebrow">File</p>
        <h2>{current.type}</h2>
        <dl>
          <dt>File name</dt><dd>{value(current.originalName)}</dd>
          <dt>Status</dt><dd>{current.status}</dd>
          <dt>Uploaded</dt><dd>{current.createdAt ? new Date(current.createdAt).toLocaleString() : 'Not available'}</dd>
          <dt>Type</dt><dd>{value(current.mimeType)}</dd>
          <dt>Review</dt><dd>{current.reviewComment ?? 'No review comment'}</dd>
        </dl>
        {current.secureUrl ? <a className="text-button" href={current.secureUrl} target="_blank" rel="noreferrer">Open stored file</a> : <p>No file preview is available for this document.</p>}
      </section>
    </div>
    <section className="panel eligible-panel">
      <div className="panel-heading"><div><p className="eyebrow">Document review</p><h2>Allowed actions</h2></div></div>
      <label className="status-note">Review comment<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional review comment" /></label>
      <div className="status-actions">{documentReviewStatuses.filter((status) => status !== current.status).map((status) => <button className="dark-button" disabled={updating} key={status} onClick={() => review(status)}>{status.replaceAll('_', ' ')}</button>)}</div>
    </section>
  </section>;
}
