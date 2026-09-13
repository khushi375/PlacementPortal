import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BarChart3, Bell, CheckCircle2, Layers3 } from 'lucide-react';
import { messageFromError } from '../phase4/phase4Api';
import { createStudentGrievance, fetchAnalytics, fetchCommandCenter, fetchCommunications, fetchDirectory, fetchPlacementGrievances, fetchStudentGrievances, sendCommunication, updateGrievanceStatus, type Analytics, type Broadcast, type CommandCenter, type DirectoryStudent, type Grievance } from './phase5Api';
import { listPlacementDrives, type Drive } from '../placement/placementApi';

export function CommandCenter() {
  const [data, setData] = useState<CommandCenter | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchCommandCenter().then(setData).catch((caught) => setError(messageFromError(caught, 'Command center data could not be loaded.'))).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-rows">Loading command center...</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="center-empty"><CheckCircle2 size={22} /><b>No operational data yet</b><p>Counts will appear when placement activity is recorded.</p></div>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">TPO command center</p><h1>Operations overview<span>.</span></h1></div></div>
    <section className="stat-grid">
      <Metric label="Active companies" value={String(data.companies.active)} detail={`${data.companies.total} total`} tone="mint" />
      <Metric label="Placement drives" value={String(data.drives.total)} detail={`${data.drives.byStatus?.PUBLISHED ?? 0} published`} tone="blue" />
      <Metric label="Applications" value={String(data.applications.total)} detail={`${data.applications.byStage?.SHORTLISTED ?? 0} shortlisted`} tone="orange" />
      <Metric label="Open grievances" value={String(data.openGrievances)} detail={`${data.documents.byStatus?.PENDING ?? 0} documents pending`} tone="violet" />
    </section>
    <div className="content-grid">
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Pipeline</p><h2>Recent applications</h2></div></div>
        {data.recentApplications.length ? data.recentApplications.map((item) => <article className="phase4-row" key={item._id}><Layers3 size={18} /><span><b>{item.student?.user?.displayName ?? item.student?.rollNumber ?? 'Student'}</b><small>{item.drive?.role ?? 'Drive'} · {item.drive?.company?.name ?? 'Company'}</small></span><span className="status-badge status-active">{item.currentStage}</span></article>) : <div className="empty-state"><b>No applications yet</b><p>Application activity will appear here from live records.</p></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Schedule</p><h2>Upcoming interviews</h2></div></div>
        {data.upcomingInterviews.length ? data.upcomingInterviews.map((item) => <article className="phase4-row" key={item._id}><CheckCircle2 size={18} /><span><b>{item.application?.student?.user?.displayName ?? item.application?.student?.rollNumber ?? 'Student'}</b><small>{item.selectionRoundName ?? item.type} · {item.drive?.role ?? 'Drive'} · {new Date(item.date).toLocaleString()}</small></span></article>) : <div className="empty-state"><b>No upcoming interviews</b><p>Scheduled future interviews will appear here.</p></div>}
      </section>
    </div>
  </>;
}

export function AnalyticsCenter() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchAnalytics().then(setData).catch((caught) => setError(messageFromError(caught, 'Analytics could not be loaded.'))).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-rows">Loading analytics...</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="center-empty"><BarChart3 size={22} /><b>No analytics yet</b><p>Insights appear once placement records exist.</p></div>;
  const presentRate = data.attendanceMarked ? Math.round((data.presentCount / data.attendanceMarked) * 100) : null;
  return <>
    <div className="page-heading"><div><p className="eyebrow">Placement analytics</p><h1>Live insights<span>.</span></h1></div></div>
    <section className="stat-grid">
      <Metric label="Applications" value={String(data.totals.applications ?? 0)} detail="All recorded applications" tone="mint" />
      <Metric label="Interviews" value={String(data.totals.interviews ?? 0)} detail="Scheduled and completed" tone="blue" />
      <Metric label="Results" value={String(data.totals.results ?? 0)} detail="Recorded placement outcomes" tone="orange" />
      <Metric label="Present rate" value={presentRate === null ? '—' : `${presentRate}%`} detail={presentRate === null ? 'No marked attendance yet' : `${data.presentCount} present of ${data.attendanceMarked} marked`} tone="violet" />
    </section>
    <div className="detail-layout">
      <Breakdown title="Applications by status" items={data.applicationsByStage} />
      <Breakdown title="Drives by status" items={data.drivesByStatus} />
      <Breakdown title="Interviews by status" items={data.interviewsByStatus} />
      <Breakdown title="Attendance" items={data.attendanceByStatus} />
      <Breakdown title="Documents" items={data.documentsByStatus} />
      <Breakdown title="Placement results" items={data.resultsByStatus} />
    </div>
    <section className="panel eligible-panel">
      <div className="panel-heading"><div><p className="eyebrow">Demand</p><h2>Applications by drive</h2></div></div>
      {data.applicationsByDrive.length ? data.applicationsByDrive.map((item, index) => <div className="analytics-row" key={`${item.role}-${index}`}><span><b>{item.role ?? 'Drive'}</b><small>{item.company ?? 'Company'} · {item.selected} selected · {item.rejected} rejected</small></span><strong>{item.total}</strong></div>) : <div className="empty-state"><b>No drive application volume yet</b><p>This table fills when students apply to published drives.</p></div>}
    </section>
  </>;
}

export function CommunicationCenter() {
  const [tab, setTab] = useState<'send' | 'history' | 'grievances'>('send');
  return <section>
    <div className="page-heading"><div><p className="eyebrow">Communication</p><h1>Student notices<span>.</span></h1></div></div>
    <div className="toolbar">{['send', 'history', 'grievances'].map((item) => <button className={tab === item ? 'dark-button' : 'outline-button'} key={item} onClick={() => setTab(item as typeof tab)}>{item}</button>)}</div>
    {tab === 'send' ? <SendNotice /> : tab === 'history' ? <NoticeHistory /> : <GrievanceQueue />}
  </section>;
}

function SendNotice() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('ANNOUNCEMENT');
  const [audience, setAudience] = useState<'ALL_STUDENTS' | 'DRIVE_APPLICANTS' | 'SELECTED_STUDENTS'>('ALL_STUDENTS');
  const [driveId, setDriveId] = useState('');
  const [drives, setDrives] = useState<Drive[]>([]);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { listPlacementDrives({}).then((result) => setDrives(result.items)).catch(() => undefined); }, []);
  useEffect(() => { if (audience === 'SELECTED_STUDENTS') fetchDirectory(search).then(setStudents).catch((caught) => setError(messageFromError(caught, 'Student directory could not be loaded.'))); }, [audience, search]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true); setError(''); setSuccess('');
    try {
      const payload: Record<string, unknown> = { title, message, type };
      if (audience === 'ALL_STUDENTS') payload.allStudents = true;
      if (audience === 'DRIVE_APPLICANTS') payload.driveId = driveId;
      if (audience === 'SELECTED_STUDENTS') payload.studentIds = selected;
      const result = await sendCommunication(payload);
      setSuccess(`Notice sent to ${result.sent} student${result.sent === 1 ? '' : 's'}.`);
      setTitle(''); setMessage(''); setSelected([]);
    } catch (caught) {
      setError(messageFromError(caught, 'The notice could not be sent.'));
    } finally {
      setSending(false);
    }
  }
  return <form className="editor-form" onSubmit={submit}>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option>ANNOUNCEMENT</option><option>DRIVE_UPDATE</option><option>INTERVIEW</option><option>RESULT</option><option>GENERAL</option></select></label>
    <label>Audience<select value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}><option value="ALL_STUDENTS">All active students</option><option value="DRIVE_APPLICANTS">Applicants of a drive</option><option value="SELECTED_STUDENTS">Selected students</option></select></label>
    {audience === 'DRIVE_APPLICANTS' && <label>Placement drive<select required value={driveId} onChange={(event) => setDriveId(event.target.value)}><option value="">Select drive</option>{drives.map((drive) => <option key={drive._id} value={drive._id}>{drive.role} · {drive.company.name}</option>)}</select></label>}
    {audience === 'SELECTED_STUDENTS' && <>
      <label>Search students<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Roll number" /></label>
      <div className="phase4-list">{students.map((student) => { const userId = String(student.user && typeof student.user === 'object' && '_id' in student.user ? student.user._id : student.user ?? ''); return <label className="phase4-row" key={student._id}><input type="checkbox" checked={selected.includes(userId)} onChange={() => setSelected((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId])} /><span><b>{student.user?.displayName ?? 'Student'}</b><small>{student.rollNumber ?? 'No roll number'} · {student.user?.email ?? 'Email unavailable'}</small></span></label>; })}</div>
    </>}
    <label>Message<textarea required value={message} onChange={(event) => setMessage(event.target.value)} /></label>
    <button className="dark-button" disabled={sending}><Bell size={16} /> Send notice</button>
  </form>;
}

function NoticeHistory() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchCommunications().then(setItems).catch((caught) => setError(messageFromError(caught, 'Sent notices could not be loaded.'))).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-rows">Loading notices...</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!items.length) return <div className="center-empty"><Bell size={22} /><b>No notices sent yet</b><p>Sent announcements are stored as student notifications.</p></div>;
  return <div className="phase4-list">{items.map((item) => <article className="phase4-row" key={item._id}><Bell size={18} /><span><b>{item.title}</b><small>{item.audience ?? 'Audience'} · {item.count} recipients · {item.sentAt ? new Date(item.sentAt).toLocaleString() : 'Date unavailable'}</small></span><span className="status-badge status-active">{item.type}</span></article>)}</div>;
}

function GrievanceQueue() {
  const [items, setItems] = useState<Grievance[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); fetchPlacementGrievances().then(setItems).catch((caught) => setError(messageFromError(caught, 'Grievances could not be loaded.'))).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function change(id: string, status: string) {
    setError(''); setSuccess('');
    try { const updated = await updateGrievanceStatus(id, status); setItems((current) => current.map((item) => item._id === id ? updated : item)); setSuccess(`Grievance updated to ${status}.`); }
    catch (caught) { setError(messageFromError(caught, 'The grievance could not be updated.')); }
  }
  if (loading) return <div className="loading-rows">Loading grievances...</div>;
  return <>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    {items.length ? <div className="phase4-list">{items.map((item) => <article className="phase4-row attendance-row" key={item._id}><span><b>{item.subject}</b><small>{item.student?.user?.displayName ?? item.student?.rollNumber ?? 'Student'} · {item.priority ?? 'MEDIUM'} · {item.category ?? 'General'}</small></span><span className="status-badge status-active">{item.status}</span><div className="status-actions">{['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].filter((status) => status !== item.status).map((status) => <button className="outline-button" key={status} onClick={() => change(item._id, status)}>{status.replaceAll('_', ' ')}</button>)}</div></article>)}</div> : <div className="center-empty"><CheckCircle2 size={22} /><b>No grievances submitted</b><p>Student grievances will appear here when filed.</p></div>}
  </>;
}

export function StudentGrievances() {
  const [items, setItems] = useState<Grievance[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); fetchStudentGrievances().then(setItems).catch((caught) => setError(messageFromError(caught, 'Grievances could not be loaded.'))).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setSuccess('');
    try { await createStudentGrievance({ subject, description, category, priority }); setSubject(''); setDescription(''); setSuccess('Grievance submitted.'); load(); }
    catch (caught) { setError(messageFromError(caught, 'The grievance could not be submitted.')); }
  }
  return <section className="editor">
    <div className="editor-heading"><p className="eyebrow">Student portal</p><h1>Grievances<span>.</span></h1><p className="muted">Submit a concern to the Placement Center. This is stored in the existing grievance records.</p></div>
    {error && <div className="error-banner">{error}</div>}
    {success && <div className="success-banner">{success}</div>}
    <form className="editor-form" onSubmit={submit}>
      <label>Subject<input required value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
      <div className="form-row"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>GENERAL</option><option>DRIVE</option><option>INTERVIEW</option><option>DOCUMENT</option><option>RESULT</option></select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label></div>
      <label>Description<textarea required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <button className="dark-button">Submit grievance</button>
    </form>
    {loading ? <div className="loading-rows">Loading grievances...</div> : items.length ? <div className="phase4-list">{items.map((item) => <article className="phase4-row" key={item._id}><span><b>{item.subject}</b><small>{item.category ?? 'General'} · {new Date(item.createdAt).toLocaleDateString()}</small></span><span className="status-badge status-active">{item.status}</span></article>)}</div> : <p className="muted">You have not submitted any grievances yet.</p>}
  </section>;
}

function Breakdown({ title, items }: { title: string; items: Record<string, number> }) {
  const entries = Object.entries(items);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return <section className="panel detail-panel">
    <p className="eyebrow">{title}</p>
    {entries.length ? entries.map(([label, count]) => <div className="analytics-row" key={label}><span><b>{label.replaceAll('_', ' ')}</b><div className="analytics-bar"><span style={{ width: `${(count / max) * 100}%` }} /></div></span><strong>{count}</strong></div>) : <p>No records in this category yet.</p>}
  </section>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className={`metric ${tone}`}><div className="metric-icon"><CheckCircle2 size={16} /></div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>;
}
