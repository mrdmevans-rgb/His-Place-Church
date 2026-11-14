import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, friendlyError, TEAMS } from './supabase'

/* ---------------- who is signed in ---------------- */
export const PortalContext = createContext(null)
export const usePortal = () => useContext(PortalContext)

export function useMe() {
  const { profile } = usePortal()
  const role = profile?.active ? profile.role : null
  return {
    profile,
    role,
    isAdmin: role === 'admin',
    isPastoral: role === 'admin' || role === 'pastor',
    isStaff: role === 'admin' || role === 'pastor' || role === 'leader',
    onTeam: (t) => ['admin', 'pastor', 'leader'].includes(role) && (profile?.teams || []).includes(t),
  }
}

export function usePeople() {
  const { people } = usePortal()
  const name = (id) => (id && people[id] ? people[id].full_name || people[id].email : '')
  return { people, name }
}

/* ---------------- loading rows ---------------- */
export function useRows(table, { select = '*', order = 'created_at', ascending = false, filter, deps = [] } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from(table).select(select)
    if (filter) q = filter(q)
    if (order) q = q.order(order, { ascending })
    const { data, error: err } = await q
    setRows(data || [])
    setError(err ? friendlyError(err) : '')
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, order, ascending, ...deps])
  useEffect(() => { load() }, [load])
  return { rows, loading, error, reload: load, setRows }
}

/* ---------------- formatting ---------------- */
export const fmtDate = (d) => {
  if (!d) return ''
  const x = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00') : new Date(d)
  return x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')
export const today = () => new Date().toISOString().slice(0, 10)
export const daysUntil = (d) => (d ? Math.ceil((new Date(d + 'T12:00:00') - new Date()) / 86400000) : null)
export const toLocalInput = (d) => {
  if (!d) return ''
  const x = new Date(d)
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/* ---------------- small pieces ---------------- */
export function Badge({ tone = 'neutral', children }) {
  return <span className={`p-badge p-badge-${tone}`}>{children}</span>
}

export function Notice({ tone = 'info', children }) {
  if (!children) return null
  return <div className={`p-notice p-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function PageHead({ title, intro, children }) {
  return (
    <div className="p-pagehead">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="p-pagehead-actions">{children}</div>}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="p-empty">{children}</div>
}

/* ---------------- forms ----------------
   fields: [{ name, label, type: text|textarea|date|datetime|select|checkbox|number|teams|person|email|tel,
              options: [[value,label]], required, help, half }]
------------------------------------------------------------------- */
export function Field({ f, value, onChange }) {
  const { people } = usePortal()
  const id = `f-${f.name}`
  const set = (v) => onChange(f.name, v)
  let input
  switch (f.type) {
    case 'textarea':
      input = <textarea id={id} rows={f.rows || 4} value={value ?? ''} required={f.required} maxLength={f.max || 8000} onChange={(e) => set(e.target.value)} />
      break
    case 'select':
      input = (
        <select id={id} value={value ?? ''} required={f.required} onChange={(e) => set(e.target.value)}>
          {!f.required && <option value="">{f.placeholder || 'Choose one'}</option>}
          {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )
      break
    case 'person':
      input = (
        <select id={id} value={value ?? ''} required={f.required} onChange={(e) => set(e.target.value || null)}>
          <option value="">{f.placeholder || 'Choose a person'}</option>
          {Object.values(people).filter((p) => p.active && p.role !== 'applicant').sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
            .map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
      )
      break
    case 'checkbox':
      return (
        <label className="p-check">
          <input type="checkbox" checked={!!value} required={f.required} onChange={(e) => set(e.target.checked)} />
          <span>{f.label}{f.help && <small>{f.help}</small>}</span>
        </label>
      )
    case 'teams':
      return (
        <fieldset className="p-teams">
          <legend>{f.label}</legend>
          {TEAMS.map(([t, l]) => (
            <label key={t} className="p-check inline">
              <input type="checkbox" checked={(value || []).includes(t)} onChange={(e) => set(e.target.checked ? [...(value || []), t] : (value || []).filter((x) => x !== t))} />
              <span>{l}</span>
            </label>
          ))}
        </fieldset>
      )
    case 'datetime':
      input = <input id={id} type="datetime-local" value={toLocalInput(value)} required={f.required} onChange={(e) => set(e.target.value ? new Date(e.target.value).toISOString() : null)} />
      break
    case 'number':
      input = <input id={id} type="number" step={f.step || 'any'} min={f.min} value={value ?? ''} required={f.required} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} />
      break
    case 'date':
      input = <input id={id} type="date" value={value ?? ''} required={f.required} onChange={(e) => set(e.target.value || null)} />
      break
    default:
      input = <input id={id} type={f.type || 'text'} value={value ?? ''} required={f.required} maxLength={f.max || 300} placeholder={f.placeholder} pattern={f.pattern} onChange={(e) => set(e.target.value)} />
  }
  return (
    <div className={`p-field${f.half ? ' half' : ''}`}>
      <label htmlFor={id}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>
      {input}
      {f.help && <small>{f.help}</small>}
    </div>
  )
}

export function Form({ fields, initial = {}, onSubmit, submitLabel = 'Save', onCancel, busyLabel = 'Saving...' }) {
  const [values, setValues] = useState(() => ({ ...Object.fromEntries(fields.map((f) => [f.name, f.default ?? (f.type === 'teams' ? [] : f.type === 'checkbox' ? false : '')])), ...initial }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' && fields.find((f) => f.name === k && ['date', 'datetime', 'number', 'person'].includes(f.type)) ? null : v]))
    const err = await onSubmit(clean)
    setBusy(false)
    if (err) setError(typeof err === 'string' ? err : friendlyError(err))
  }
  return (
    <form className="p-form" onSubmit={submit}>
      <div className="p-form-grid">
        {fields.filter((f) => !f.hidden || !f.hidden(values)).map((f) => <Field key={f.name} f={f} value={values[f.name]} onChange={change} />)}
      </div>
      <Notice tone="error">{error}</Notice>
      <div className="p-form-actions">
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? busyLabel : submitLabel}</button>
        {onCancel && <button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

/* ---------------- a simple list-and-form module ----------------
   Used for announcements, calendar, songs, equipment, clearances, incidents.
------------------------------------------------------------------- */
export function Collection({
  table, title, intro, fields, addLabel = 'Add', order = 'created_at', ascending = false, filter,
  renderItem, canAdd = true, canEdit = () => false, canDelete = () => false, prepare = (v) => v, emptyText = 'Nothing here yet.', toolbar, deps = [],
}) {
  const { rows, loading, error, reload } = useRows(table, { order, ascending, filter, deps })
  const [editing, setEditing] = useState(null) // null | 'new' | row
  const [msg, setMsg] = useState('')

  const save = async (values) => {
    const payload = prepare(values, editing)
    const q = editing === 'new'
      ? supabase.from(table).insert(payload)
      : supabase.from(table).update(payload).eq('id', editing.id)
    const { error: err } = await q
    if (err) return err
    setEditing(null)
    setMsg('Saved.')
    reload()
    return null
  }
  const remove = async (row) => {
    if (!window.confirm('Delete this? This cannot be undone.')) return
    const { error: err } = await supabase.from(table).delete().eq('id', row.id)
    setMsg(err ? friendlyError(err) : 'Deleted.')
    reload()
  }

  return (
    <>
      <PageHead title={title} intro={intro}>
        {canAdd && editing !== 'new' && <button className="button button-primary" onClick={() => { setEditing('new'); setMsg('') }}>{addLabel}</button>}
      </PageHead>
      {toolbar}
      <Notice tone="success">{msg}</Notice>
      <Notice tone="error">{error}</Notice>
      {editing === 'new' && (
        <div className="p-card"><h2 className="p-card-title">{addLabel}</h2><Form fields={fields} onSubmit={save} onCancel={() => setEditing(null)} /></div>
      )}
      {loading ? <p className="p-muted">Loading...</p> : rows.length === 0 ? <Empty>{emptyText}</Empty> : (
        <div className="p-list">
          {rows.map((row) => (
            <div className="p-card" key={row.id}>
              {editing && editing !== 'new' && editing.id === row.id ? (
                <Form fields={fields} initial={row} onSubmit={save} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  {renderItem(row, reload)}
                  {(canEdit(row) || canDelete(row)) && (
                    <div className="p-row-actions">
                      {canEdit(row) && <button className="p-link" onClick={() => setEditing(row)}>Edit</button>}
                      {canDelete(row) && <button className="p-link danger" onClick={() => remove(row)}>Delete</button>}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
