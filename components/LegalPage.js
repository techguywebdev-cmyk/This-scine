// Server-rendered layout for /privacy and /terms — matches the app's ambient look without client JS.
import { APP_NAME, LEGAL_UPDATED } from '@/lib/brand';

const A = '#F5A623';
const bg = `radial-gradient(120% 70% at 0% 0%, ${A}2e 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${A}24 0%, transparent 70%), linear-gradient(165deg, ${A}1f 0%, ${A}12 50%, ${A}1c 100%), #06060B`;
const serif = "var(--font-display), 'Inter Tight', system-ui, sans-serif";

export function LegalPage({ eyebrow, title, intro, sections, other }) {
  return (
    <main style={{ position: 'fixed', inset: 0, background: bg, color: '#fff', fontFamily: "var(--font-sans), Inter, system-ui, sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'max(28px, env(safe-area-inset-top)) 20px calc(80px + env(safe-area-inset-bottom))' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 18, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← {APP_NAME}</a>
        <div style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: A, marginTop: 36 }}>{eyebrow}</div>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '10px 0 0' }}>{title}</h1>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>Last updated {LEGAL_UPDATED}</div>
        <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', marginTop: 22 }}>{intro}</p>
        {sections.map((s, i) => (
          <section key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 28, paddingTop: 22 }}>
            <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{s.h}</h2>
            {s.p && s.p.map((t, j) => <p key={j} style={{ fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)', margin: '12px 0 0' }}>{t}</p>)}
            {s.list && <ul style={{ margin: '12px 0 0', paddingLeft: 20 }}>{s.list.map((t, j) => <li key={j} style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', marginTop: 8 }}>{t}</li>)}</ul>}
          </section>
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 36, paddingTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          See also our <a href={other.href} style={{ color: A }}>{other.label}</a>.
        </div>
      </div>
      </div>
    </main>
  );
}
