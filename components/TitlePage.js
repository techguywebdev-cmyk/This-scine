// Public, server-rendered page for a film or show. Matches the app's look; every CTA leads into the app.
import TrailerLite from '@/components/TrailerLite';
import { APP_NAME } from '@/lib/brand';
import { ambient, accentForId, titlePath } from '@/lib/look';

const serif = "var(--font-display), 'Inter Tight', system-ui, sans-serif";
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });
const hr = { borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 32, paddingTop: 24 };
const fmtRuntime = (m) => (m ? (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`) : null);
const ago = (iso) => { const d = (Date.now() - Date.parse(iso)) / 864e5; return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${Math.floor(d)} days ago` : new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); };

export function TitlePage({ t, reviews }) {
  const A = accentForId(t.id);
  const ref = `${t.type === 'tv' ? 'tv' : 'movie'}-${t.id}`;
  const open = (act) => `/?m=${ref}${act ? `&act=${act}` : ''}`;
  const meta = [t.year, t.type === 'tv' ? (t.seasons ? `${t.seasons} season${t.seasons > 1 ? 's' : ''}` : 'Series') : fmtRuntime(t.runtime), t.cert || null].filter(Boolean);
  const btn = { ...glass, height: 50, borderRadius: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', fontSize: 14.5, fontWeight: 800, textDecoration: 'none', padding: '0 14px', whiteSpace: 'nowrap' };
  return (
    <main style={{ position: 'fixed', inset: 0, background: ambient(A), color: '#fff', fontFamily: "var(--font-sans), Inter, system-ui, sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        {/* Backdrop */}
        <div style={{ position: 'relative', height: 'min(56vw, 420px)', minHeight: 230 }}>
          {t.backdrop && <img src={t.backdrop} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%', WebkitMaskImage: 'linear-gradient(to bottom,#000 35%,transparent 100%)', maskImage: 'linear-gradient(to bottom,#000 35%,transparent 100%)', opacity: 0.85 }} />}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top)) 16px 0' }}>
            <a href="/" style={{ ...glass, height: 36, borderRadius: 18, padding: '0 14px', display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>{APP_NAME}</a>
            <a href={open()} style={{ ...glass, height: 36, borderRadius: 18, padding: '0 14px', display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Open in app</a>
          </div>
        </div>

        <article style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px calc(60px + env(safe-area-inset-bottom))', marginTop: -110, position: 'relative' }}>
          {/* Identity */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {t.poster && <img src={t.poster} alt={`${t.title} poster`} width="120" height="180" style={{ width: 120, height: 180, objectFit: 'cover', borderRadius: 10, boxShadow: '0 20px 50px rgba(0,0,0,0.6)', flexShrink: 0 }} />}
            <div style={{ minWidth: 0, paddingBottom: 4 }}>
              <div style={eyebrow(A)}>{t.type === 'tv' ? 'Series' : 'Film'}{t.genres.length ? ` · ${t.genres.slice(0, 2).join(' · ')}` : ''}</div>
              <h1 style={{ fontFamily: serif, fontSize: 'clamp(26px, 6vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08, margin: '8px 0 0' }}>{t.title}</h1>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{meta.join(' · ')}</div>
              {t.rating && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, fontWeight: 800 }}><span style={{ color: A }}>★</span>{t.rating}<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>/10 on TMDB</span></div>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
            <a href={open('save')} style={{ ...btn, background: `${A}33`, borderColor: A }}>＋ Watchlist</a>
            <a href={open('party')} style={btn}>🍿 Watch together</a>
          </div>

          {t.tagline && <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', margin: '28px 0 0' }}>“{t.tagline}”</p>}
          {t.overview && <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.8)', margin: t.tagline ? '10px 0 0' : '28px 0 0' }}>{t.overview}</p>}
          {t.directors.length > 0 && <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>{t.type === 'tv' ? 'Created by' : 'Directed by'} <span style={{ color: '#fff', fontWeight: 700 }}>{t.directors.slice(0, 3).join(', ')}</span></div>}

          {/* Where to watch */}
          <section style={hr}>
            <div style={eyebrow(A)}>Where to watch{t.providerRegion ? ` · ${t.providerRegion}` : ''}</div>
            {t.providers.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
                {t.providers.map((p) => (
                  <a key={p.name} href={t.providerLink || open()} target="_blank" rel="nofollow noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, ...glass, borderRadius: 14, padding: '7px 12px 7px 7px', color: '#fff', textDecoration: 'none' }}>
                    <img src={p.logo} alt="" width="34" height="34" style={{ width: 34, height: 34, borderRadius: 9 }} />
                    <span><span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{p.name}</span><span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{p.kind}</span></span>
                  </a>
                ))}
              </div>
            ) : <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10 }}>Not streaming right now. Save it in {APP_NAME} to keep it on your list.</div>}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>Streaming data by JustWatch</div>
          </section>

          {t.trailer && (
            <section style={hr}>
              <div style={{ ...eyebrow(A), marginBottom: 14 }}>Trailer</div>
              <TrailerLite id={t.trailer.key} title={t.title} accent={A} />
            </section>
          )}

          {t.cast.length > 0 && (
            <section style={hr}>
              <div style={eyebrow(A)}>Cast</div>
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', marginTop: 14, paddingBottom: 6, scrollbarWidth: 'none' }}>
                {t.cast.map((c) => (
                  <div key={c.name + c.character} style={{ width: 76, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', margin: '0 auto', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{c.photo ? <img src={c.photo} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name[0]}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 7, lineHeight: 1.25 }}>{c.name}</div>
                    {c.character && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.25 }}>{c.character}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Community */}
          <section style={hr}>
            <div style={eyebrow(A)}>On {APP_NAME}</div>
            {reviews.length ? reviews.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: i ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `${A}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{r.avatar ? <img src={r.avatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.name[0]}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.handle ? <a href={`/u/${r.handle}`} style={{ color: '#fff', textDecoration: 'none' }}>{r.name}</a> : r.name}{r.rating ? <span style={{ color: A, marginLeft: 8 }}>{'★'.repeat(Math.min(5, r.rating))}</span> : null}<span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginLeft: 8 }}>{ago(r.at)}</span></div>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>{r.text}</p>
                </div>
              </div>
            )) : <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.55 }}>No reviews yet. <a href={open()} style={{ color: A, fontWeight: 700 }}>Be the first to review {t.title}</a>.</div>}
          </section>

          {/* More like this */}
          {t.similar.length > 0 && (
            <section style={hr}>
              <div style={eyebrow(A)}>If you like {t.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, marginTop: 14 }}>
                {t.similar.map((m) => (
                  <a key={m.type + m.id} href={titlePath(m.type, m.id, m.title)} style={{ color: '#fff', textDecoration: 'none' }}>
                    <img src={m.poster} alt={`${m.title} poster`} loading="lazy" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 7, display: 'block', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                    {m.year && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>{m.year}</div>}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Pitch */}
          <section style={{ ...hr, textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 800 }}>Find your next favourite</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 8, lineHeight: 1.55 }}>Scroll trailers, see what friends are saving, and press play together with a watch party.</div>
            <a href={open()} style={{ ...btn, display: 'inline-flex', marginTop: 16, background: `${A}33`, borderColor: A }}>Open {t.title} in {APP_NAME}</a>
          </section>

          <footer style={{ marginTop: 36, fontSize: 11.5, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6 }}>
            Film data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.<br />
            <a href="/privacy" style={{ color: 'rgba(255,255,255,0.55)' }}>Privacy</a> · <a href="/terms" style={{ color: 'rgba(255,255,255,0.55)' }}>Terms</a>
          </footer>
        </article>
      </div>
    </main>
  );
}
