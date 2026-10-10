'use client';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { ambient } from '@/lib/look';

// Private launch dashboard — only accounts listed in app_secrets.admin_user_ids can load data.
const A = '#F5A623';
const serif = "var(--font-display), 'Inter Tight', system-ui, sans-serif";
const ink = { primary: '#fff', secondary: 'rgba(255,255,255,0.72)', muted: 'rgba(255,255,255,0.5)', hair: 'rgba(255,255,255,0.1)' };
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = { fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: A };
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const nf = (n) => (n == null ? '—' : Number(n).toLocaleString('en-GB'));
const dayLabel = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const ago = (iso) => { const m = (Date.now() - Date.parse(iso)) / 60000; return m < 60 ? `${Math.max(1, Math.round(m))}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

function Section({ title, note, children }) {
  return (
    <section style={{ borderTop: `1px solid ${ink.hair}`, marginTop: 30, paddingTop: 22 }}>
      <div style={eyebrow}>{title}</div>
      {note && <div style={{ fontSize: 12.5, color: ink.muted, marginTop: 6, lineHeight: 1.5 }}>{note}</div>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div style={{ padding: '14px 0', borderTop: `1px solid ${ink.hair}` }}>
      <div style={{ fontSize: 12, color: ink.secondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: ink.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// Single-series daily bar chart with hover/tap tooltip
function DailyBars({ rows }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r.active));
  const H = 140;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, borderBottom: `1px solid ${ink.hair}` }} onMouseLeave={() => setHover(null)}>
        {rows.map((r, i) => (
          <div key={r.day} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}>
            <div style={{ width: '100%', height: `${(r.active / max) * 100}%`, minHeight: r.active ? 3 : 0, background: A, opacity: hover == null || hover === i ? 1 : 0.45, borderRadius: '4px 4px 0 0', transition: 'opacity .15s' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: ink.muted, marginTop: 6 }}>
        <span>{rows[0] && dayLabel(rows[0].day)}</span><span>{rows.length > 1 && dayLabel(rows[rows.length - 1].day)}</span>
      </div>
      {hover != null && rows[hover] && (
        <div style={{ position: 'absolute', top: -6, left: `clamp(0px, calc(${((hover + 0.5) / rows.length) * 100}% - 70px), calc(100% - 140px))`, width: 140, ...glass, background: 'rgba(10,10,16,0.9)', borderRadius: 10, padding: '8px 10px', fontSize: 12, pointerEvents: 'none' }}>
          <div style={{ fontWeight: 800 }}>{dayLabel(rows[hover].day)}</div>
          <div style={{ color: ink.secondary, marginTop: 3 }}>{rows[hover].active} active · {rows[hover].members} signed in</div>
          <div style={{ color: ink.secondary }}>{rows[hover].signups} new signup{rows[hover].signups === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  );
}

// Funnel: horizontal bars, each a share of the first step
function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.n || 0);
  return (
    <div>
      {steps.map((s, i) => (
        <div key={s.label} style={{ padding: '9px 0', borderTop: i ? `1px solid ${ink.hair}` : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
            <span style={{ color: ink.primary, fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: ink.secondary }}><b style={{ color: ink.primary }}>{nf(s.n)}</b>{i > 0 && <span style={{ marginLeft: 8 }}>{pct(s.n, top)}</span>}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginTop: 7, overflow: 'hidden' }} title={`${s.label}: ${s.n}`}>
            <div style={{ width: `${Math.min(100, ((s.n || 0) / top) * 100)}%`, height: '100%', background: A, borderRadius: 4, opacity: i === 0 ? 1 : 0.85 }} />
          </div>
          {s.hint && <div style={{ fontSize: 11.5, color: ink.muted, marginTop: 5 }}>{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}

function Rows({ rows }) {
  return rows.map(([k, v, hint], i) => (
    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '10px 0', borderTop: i ? `1px solid ${ink.hair}` : 'none', fontSize: 14 }}>
      <span style={{ color: ink.secondary }}>{k}{hint && <span style={{ display: 'block', fontSize: 11.5, color: ink.muted, marginTop: 2 }}>{hint}</span>}</span>
      <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  ));
}

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | denied | error
  const load = useCallback(async () => {
    setState((s) => (s === 'ok' ? 'ok' : 'loading'));
    try {
      const r = await fetch(`/api/admin/stats?days=${days}`, { cache: 'no-store' });
      if (r.status === 404 || r.status === 401) { setState('denied'); return; }
      const d = await r.json();
      if (d?.code || d?.error) throw new Error(d.message || d.error);
      setData(d); setState('ok');
    } catch { setState('error'); }
  }, [days]);
  useEffect(() => { if (isLoaded && isSignedIn) load(); else if (isLoaded) setState('denied'); }, [isLoaded, isSignedIn, load]);
  const resolve = async (id, status) => {
    setData((d) => ({ ...d, reports: { ...d.reports, open: Math.max(0, d.reports.open - 1), recent: d.reports.recent.filter((r) => r.id !== id) } }));
    await fetch('/api/admin/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: id, status }) }).catch(() => {});
  };

  const c = data?.counts || {};
  const f = data?.funnel || {};
  const L = data?.loop || {};
  const P = data?.parties || {};
  const signupsByDay = data?.clerk?.byDay || {};
  const daily = (data?.daily || []).map((r) => ({ ...r, signups: signupsByDay[r.day] || 0 }));
  const signups = data?.clerk ? data.clerk.signups : data?.new_members;
  const cohorts = (data?.cohorts || []).slice(-6);
  const lastDone = [...cohorts].reverse().find((x) => x.complete);

  return (
    <main style={{ position: 'fixed', inset: 0, background: ambient(A), color: '#fff', fontFamily: "var(--font-sans), Inter, system-ui, sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: 'max(24px, env(safe-area-inset-top)) 20px calc(60px + env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="/" style={{ ...glass, height: 36, borderRadius: 18, padding: '0 14px', display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>← App</a>
            {state === 'ok' && <button onClick={load} style={{ ...glass, height: 36, borderRadius: 18, padding: '0 14px', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Refresh</button>}
          </div>

          <div style={{ ...eyebrow, marginTop: 28 }}>Launch dashboard</div>
          <h1 style={{ fontFamily: serif, fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', margin: '8px 0 0' }}>How it’s going</h1>

          {state === 'denied' && <div style={{ fontSize: 15, color: ink.secondary, marginTop: 18, lineHeight: 1.6 }}>{isSignedIn ? 'This page isn’t available for your account.' : 'Sign in with an admin account to see this page.'}</div>}
          {state === 'error' && <div style={{ fontSize: 15, color: '#ff9a9a', marginTop: 18 }}>Couldn’t load stats. <button onClick={load} style={{ background: 'none', border: 'none', color: A, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>Try again</button></div>}
          {state === 'loading' && <div style={{ fontSize: 14, color: ink.muted, marginTop: 18 }}>Loading…</div>}

          {state === 'ok' && data && (
            <>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {[7, 14, 30].map((d) => (
                  <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} style={{ ...glass, height: 32, borderRadius: 16, padding: '0 14px', color: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', ...(days === d ? { background: `${A}33`, borderColor: A } : {}) }}>{d} days</button>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: ink.muted, marginTop: 10 }}>Updated {ago(data.generated_at)} · activity tracking began 10 Oct 2026</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', columnGap: 24, marginTop: 18 }}>
                <Tile label="New signups" value={nf(signups)} sub={`${nf(data.clerk?.total ?? data.total_members)} members in total`} />
                <Tile label="Active people" value={nf(data.active_people)} sub={`${nf(data.active_members)} signed in`} />
                <Tile label="Came back in week 2" value={lastDone ? pct(lastDone.returned_w2, lastDone.size) : '—'} sub={lastDone ? `of ${lastDone.size} who joined w/c ${dayLabel(lastDone.week)}` : 'Needs two full weeks of data'} />
                <Tile label="Watch parties finished" value={nf(P.finished)} sub={`of ${nf(P.created)} invites · ${nf(P.scheduled)} scheduled`} />
              </div>

              <Section title="Active people per day" note="Everyone who opened the app, signed in or not. Tap a bar for details.">
                <DailyBars rows={daily} />
              </Section>

              <Section title="Onboarding" note="Where new people drop off. Each % is of those who started.">
                <Funnel steps={[
                  { label: 'Started onboarding', n: f.started },
                  { label: 'Picked 5 titles', n: f.picked },
                  { label: 'Tapped import', n: f.import_tapped, hint: f.imported ? `${nf(f.imported)} imported ${nf(f.imported_titles)} titles` : 'Nobody has imported yet' },
                  { label: 'Finished', n: f.finished, hint: f.skipped ? `${nf(f.skipped)} skipped part-way` : null },
                ]} />
              </Section>

              <Section title="Growth loop" note="How new people find the app.">
                <Rows rows={[
                  ['Film page views', nf(L.title_page_views), `${nf(L.title_page_visitors)} different visitors`],
                  ['Invite links sent', nf(L.invites_sent)],
                  ['Invite links opened', nf(L.invite_opens)],
                  ['Everything shared', nf(L.shares), 'Films, profiles, invites and recaps'],
                ]} />
              </Section>

              <Section title="Watch parties">
                <Rows rows={[
                  ['Invites sent', nf(P.created)],
                  ['Scheduled for later', nf(P.scheduled)],
                  ['Got to press play', `${nf(P.started)} · ${pct(P.started, P.created)}`],
                  ['Watched past 5 minutes', `${nf(P.finished)} · ${pct(P.finished, P.created)}`],
                  ['Declined', nf(P.declined)],
                  ['Average length', P.avg_minutes != null ? `${P.avg_minutes} min` : '—'],
                  ['Average recap rating', P.avg_rating != null ? `${P.avg_rating} ★` : '—'],
                ]} />
              </Section>

              <Section title="What people do">
                <Rows rows={[
                  ['Films opened', nf(c.title_open)],
                  ['Saved to watchlist', nf(c.save)],
                  ['Marked watched', nf(c.watched)],
                  ['Reviews', nf(c.review)],
                  ['Messages', nf(c.message)],
                  ['Statuses posted', nf(c.status_post)],
                  ['Follows', nf(c.follow)],
                  ['Folders created', nf(c.folder_create)],
                ]} />
              </Section>

              <Section title="Retention by signup week" note="Of the people who joined each week, how many came back the following week.">
                {cohorts.length ? (
                  <div>
                    {cohorts.map((k, i) => (
                      <div key={k.week} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, padding: '10px 0', borderTop: i ? `1px solid ${ink.hair}` : 'none', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: ink.secondary }}>Week of {dayLabel(k.week)}</span>
                        <span>{k.size} joined</span>
                        <span style={{ fontWeight: 800, minWidth: 74, textAlign: 'right' }}>{k.complete ? `${pct(k.returned_w2, k.size)} back` : 'too early'}</span>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 14, color: ink.muted }}>No signups yet.</div>}
              </Section>

              <Section title="Health">
                <Rows rows={[['Crashes', nf(data.errors?.count)], ['Open reports', nf(data.reports?.open)], ['Blocks (all time)', nf(data.blocks)]]} />
                {(data.reports?.recent || []).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ink.secondary, marginBottom: 6 }}>Reports to review</div>
                    {data.reports.recent.map((r) => (
                      <div key={r.id} style={{ padding: '10px 0', borderTop: `1px solid ${ink.hair}` }}>
                        <div style={{ fontSize: 13.5 }}><b>#{r.id}</b> · {r.reason} · {r.kind} <span style={{ color: ink.muted }}>· {ago(r.at)}</span></div>
                        {r.note && <div style={{ fontSize: 13, color: ink.secondary, marginTop: 4 }}>“{r.note}”</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => resolve(r.id, 'resolved')} style={{ ...glass, height: 30, borderRadius: 15, padding: '0 12px', color: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Dealt with</button>
                          <button onClick={() => resolve(r.id, 'dismissed')} style={{ background: 'none', border: 'none', color: ink.muted, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Dismiss</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11.5, color: ink.muted, marginTop: 6 }}>Full details (who, what was posted) are in the reports table in Supabase.</div>
                  </div>
                )}
                {(data.errors?.recent || []).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ink.secondary, marginBottom: 6 }}>Latest crashes</div>
                    {data.errors.recent.map((e, i) => (
                      <div key={i} style={{ fontSize: 12.5, padding: '8px 0', borderTop: `1px solid ${ink.hair}`, color: ink.secondary, fontFamily: 'ui-monospace, Menlo, monospace', wordBreak: 'break-word' }}>{e.msg} <span style={{ color: ink.muted }}>· {e.path} · {ago(e.at)}</span></div>
                    ))}
                  </div>
                )}
              </Section>

              {(data.clerk?.latest || []).length > 0 && (
                <Section title="Latest signups">
                  {data.clerk.latest.map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i ? `1px solid ${ink.hair}` : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: `${A}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{u.avatar ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.name[0]}</div>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: ink.muted }}>{ago(new Date(u.at).toISOString())}</div>
                    </div>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
