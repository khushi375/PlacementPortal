import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, CheckCircle2, Edit3, Plus, Trash2, X } from 'lucide-react';
import { createPreparationResource, deletePreparationResource, fetchPreparationBrief, fetchStudentCalendar, fetchStudentPreparation, listPlacementResources, preparationCategories, publishPreparationResource, setStudentProgress, updatePreparationResource, type PreparationBrief, type PreparationResource } from './phase6Api';
import { messageFromError } from '../phase4/phase4Api';
import { fetchPublishedDrives } from '../../services/studentApi';
import { DriveAiActions, InterviewPracticePanel } from './AiCoaching';

const empty = { title: '', category: 'GENERAL', url: '', description: '', isPublished: false };

export function PreparationCenter() {
  const [items, setItems] = useState<PreparationResource[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PreparationResource | null>(null);
  const [error, setError] = useState('');
  const refresh = () => listPlacementResources().then(setItems).catch((caught) => setError(messageFromError(caught, 'Preparation resources could not be loaded.')));
  useEffect(() => { refresh(); }, []);
  return <>
    <div className="page-heading"><div><p className="eyebrow">Student readiness</p><h1>Preparation resources<span>.</span></h1></div><button className="dark-button" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Add resource</button></div>
    {error && <div className="error-banner">{error}</div>}
    {items.length ? <div className="data-table">{items.map((item) => <div className="data-row" key={item._id}><div className="row-main"><b>{item.title}</b><small>{item.category} · {item.url}</small></div><span className={`status-badge ${item.isPublished ? 'status-published' : 'status-draft'}`}>{item.isPublished ? 'PUBLISHED' : 'UNPUBLISHED'}</span><button className="text-button" onClick={async () => { await publishPreparationResource(item._id, !item.isPublished); refresh(); }}>{item.isPublished ? 'Unpublish' : 'Publish'}</button><button className="icon-button" aria-label="Edit resource" onClick={() => { setEditing(item); setOpen(true); }}><Edit3 size={16} /></button><button className="icon-button" aria-label="Delete resource" onClick={async () => { if (window.confirm(`Delete ${item.title}?`)) { await deletePreparationResource(item._id); refresh(); } }}><Trash2 size={16} /></button></div>)}</div> : <div className="center-empty"><BookOpen size={22} /><b>No preparation resources yet</b><p>Add published resources for aptitude, coding, HR, and other interview rounds.</p></div>}
    {open && <ResourceDialog initial={editing} close={() => setOpen(false)} saved={() => { setOpen(false); refresh(); }} />}
  </>;
}

function ResourceDialog({ initial, close, saved }: { initial: PreparationResource | null; close: () => void; saved: () => void }) {
  const [form, setForm] = useState({ ...empty, ...(initial ? { title: initial.title, category: String(initial.category), url: initial.url ?? '', description: initial.description ?? '', isPublished: Boolean(initial.isPublished) } : {}) });
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const input = { title: form.title, category: form.category, url: form.url, description: form.description || undefined, isPublished: form.isPublished };
      if (initial) await updatePreparationResource(initial._id, { title: input.title, category: input.category, url: input.url, description: input.description });
      else await createPreparationResource(input);
      saved();
    } catch (caught) { setError(messageFromError(caught, 'The resource could not be saved.')); }
  }
  return <div className="modal-backdrop"><div className="modal"><div className="modal-heading"><h2>{initial ? 'Edit resource' : 'Add resource'}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={18} /></button></div><form className="modal-form" onSubmit={submit}>{error && <div className="error-banner">{error}</div>}<label>Title<input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{preparationCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Resource URL<input required type="url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} /></label><label>Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>{!initial && <label className="checkbox-row"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} /> Publish immediately</label>}<div className="modal-actions"><button type="button" className="outline-button" onClick={close}>Cancel</button><button className="dark-button" type="submit">Save resource</button></div></form></div></div>;
}

export function StudentPreparation() {
  const [data, setData] = useState<{ upcomingInterviewTypes: string[]; resources: PreparationResource[] } | null>(null);
  const [drives, setDrives] = useState<Array<{ drive: { _id: string; role: string; company: { name: string } } }>>([]);
  const [briefId, setBriefId] = useState('');
  const [brief, setBrief] = useState<PreparationBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); Promise.all([fetchStudentPreparation(), fetchPublishedDrives().catch(() => [])]).then(([preparation, published]) => { setData(preparation); setDrives(published as never); }).catch((caught) => setError(messageFromError(caught, 'Preparation resources could not be loaded.'))).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function toggle(resource: PreparationResource) {
    await setStudentProgress(resource._id, !resource.completed);
    setData((current) => current ? { ...current, resources: current.resources.map((item) => item._id === resource._id ? { ...item, completed: !item.completed } : item) } : current);
  }
  async function loadBrief(id: string) { setBriefId(id); if (!id) { setBrief(null); return; } try { setBrief(await fetchPreparationBrief(id)); } catch (caught) { setError(messageFromError(caught, 'Preparation brief could not be loaded.')); } }
  if (loading) return <div className="loading-screen"><BookOpen size={19} /> Loading preparation...</div>;
  if (error && !data) return <div className="error-banner">{error}</div>;
  const resources = [...(data?.resources ?? [])].sort((a, b) => Number(b.relevantToUpcomingInterview) - Number(a.relevantToUpcomingInterview));
  return <section className="phase4-page">
    <div className="editor-heading"><p className="eyebrow">Student portal</p><h1>Preparation<span>.</span></h1><p className="muted">Published resources only. Interview relevance is based on your upcoming round types.</p></div>
    {error && <div className="error-banner">{error}</div>}
    {data?.upcomingInterviewTypes.length ? <p className="muted">Upcoming interview types: {data.upcomingInterviewTypes.join(', ')}</p> : null}
    {resources.length ? <div className="phase4-list">{resources.map((item) => <ResourceRow key={item._id} item={item} onToggle={toggle} />)}</div> : <div className="standalone-empty"><div className="empty-icon"><BookOpen /></div><p className="eyebrow">No records</p><h1>No published resources yet<span>.</span></h1><p>The Placement Center will publish preparation material here.</p></div>}
    <section className="panel eligible-panel"><div className="panel-heading"><div><p className="eyebrow">Drive guidance</p><h2>Preparation brief</h2></div></div>
      <label className="select-field"><select value={briefId} onChange={(event) => loadBrief(event.target.value)}><option value="">Select a published drive</option>{drives.map((item) => <option key={item.drive._id} value={item.drive._id}>{item.drive.company.name} · {item.drive.role}</option>)}</select></label>
      {brief ? <div className="brief-grid"><p><b>Eligibility:</b> {brief.eligibility.status}</p><ul>{brief.eligibility.reasons.map((reason) => <li key={reason.rule}>{reason.passed ? 'Passed' : 'Not passed'}: {reason.message}</li>)}</ul><p><b>Required skills:</b> {brief.drive.requiredSkills.join(', ') || 'None listed'}</p><p><b>Missing skills:</b> {brief.missingSkills.join(', ') || 'None from the current eligibility result'}</p><p><b>Round types:</b> {brief.drive.roundTypes.map((round) => round.type).join(', ') || 'Not configured'}</p>{brief.interviews.length ? brief.interviews.map((item) => <p key={item.id}>{item.round ?? item.type} · {item.status} · {item.date ? new Date(item.date).toLocaleString() : 'Date unavailable'}{item.mode ? ` · ${item.mode}` : ''}</p>) : <p>No interviews scheduled for this drive.</p>}</div> : <p className="muted">Select a drive to view eligibility guidance. This does not change eligibility.</p>}
      {briefId ? <><DriveAiActions driveId={briefId} /><InterviewPracticePanel driveId={briefId} /></> : null}
    </section>
  </section>;
}

function ResourceRow({ item, onToggle }: { item: PreparationResource; onToggle: (item: PreparationResource) => Promise<void> }) {
  return <article className="phase4-row"><BookOpen size={19} /><span><b>{item.title}</b><small>{item.category}{item.relevantToUpcomingInterview ? ' · Relevant to an upcoming interview' : ''}{item.description ? ` · ${item.description}` : ''}</small>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a> : null}</span>{item.completed ? <span className="status-badge status-published">COMPLETED</span> : <span className="status-badge status-draft">TO DO</span>}<button className="text-button" onClick={() => onToggle(item)}>{item.completed ? 'Mark incomplete' : 'Mark complete'}</button></article>;
}

export function StudentCalendar() {
  const [items, setItems] = useState<import('../phase4/phase4Api').Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { fetchStudentCalendar().then(setItems).catch((caught) => setError(messageFromError(caught, 'Your calendar could not be loaded.'))).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-screen"><CheckCircle2 size={19} /> Loading calendar...</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!items.length) return <div className="standalone-empty"><div className="empty-icon"><CheckCircle2 /></div><p className="eyebrow">Student calendar</p><h1>No interviews scheduled<span>.</span></h1><p>Your own interview dates will appear here when the Placement Center schedules them.</p></div>;
  return <section className="phase4-page"><div className="editor-heading"><p className="eyebrow">Student portal</p><h1>Calendar<span>.</span></h1><p className="muted">Interviews from your own applications only.</p></div><div className="phase4-list">{items.map((item) => <article className="phase4-row" key={item._id}><CheckCircle2 size={19} /><span><b>{item.selectionRoundName ?? item.type}</b><small>{item.drive?.company?.name ?? 'Company'} · {item.drive?.role ?? 'Drive'} · {new Date(item.date).toLocaleString()}{item.mode ? ` · ${item.mode}` : ''}</small></span><span className="status-badge status-active">{item.status}</span><InterviewPracticePanel interviewId={item._id} /></article>)}</div></section>;
}
