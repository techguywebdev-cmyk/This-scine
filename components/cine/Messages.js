'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { SvgIcon, T, ambient } from './shared';

// NOTIFICATIONS PANEL


// ─── MESSAGES INBOX ─────────────────────────────────────────────────────────
// ─── Chat themes (cinema-inspired: color + type + sound) ─────────────────────
export const CHAT_UNREAD_DOTS = ['#FF6B8A', '#4DA8FF', '#F5C842', '#1CE783', '#B07FEF', '#FF7A2F', '#00A8E0', '#FF6BAE'];
export function MessagesInbox({ onClose, accent, onOpenChat, onOpenProfile }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | unread | requests | spam
  const [spamIds, setSpamIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cine_msg_spam') || '[]'); } catch { return []; }
  });

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    return `${Math.floor(days / 365) || 1}y`;
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/messages')
      .then((r) => r.json())
      .then((d) => {
        if (d.error && !d.conversations) setError(d.error);
        setConversations(d.conversations || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load messages');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const toggleSpam = (peerId) => {
    setSpamIds((prev) => {
      const next = prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId];
      try { localStorage.setItem('cine_msg_spam', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const counts = {
    all: conversations.filter((c) => !spamIds.includes(c.peer_id)).length,
    unread: conversations.filter((c) => c.unread && !spamIds.includes(c.peer_id)).length,
    requests: conversations.filter((c) => c.is_request && !spamIds.includes(c.peer_id)).length,
    spam: conversations.filter((c) => spamIds.includes(c.peer_id)).length,
  };

  const filtered = conversations.filter((c) => {
    const isSpam = spamIds.includes(c.peer_id);
    if (filter === 'spam') return isSpam;
    if (isSpam) return false;
    if (filter === 'unread') return !!c.unread;
    if (filter === 'requests') return !!c.is_request;
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      return (
        (c.display_name || '').toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        (c.last_text || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filters = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'requests', label: 'Requests', count: counts.requests },
    { id: 'spam', label: 'Spam', count: counts.spam },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 121,
          height: '88vh',
          maxHeight: 780,
          background:ambient(accent),
          borderRadius: '24px 24px 0 0',
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Title row */}
        <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily:T.serif, fontSize:21,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>
            Messages
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SvgIcon name="close" size={14} color="rgba(255,255,255,0.55)" />
          </button>
        </div>

        {/* Search — single search entry point, no redundant icon button */}
        <div style={{ padding: '14px 20px 12px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: T.surface2,
              border: `1px solid ${T.hairline}`,
              borderRadius: 14,
              padding: '11px 14px',
            }}
          >
            <SvgIcon name="search" size={15} color="rgba(255,255,255,0.3)" />
            <input
              id="cine-msg-search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search conversations"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            {searchQ ? (
              <button
                type="button"
                onClick={() => setSearchQ('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <SvgIcon name="close" size={13} color="rgba(255,255,255,0.3)" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            padding: '0 20px 14px',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            flexShrink: 0,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  background: active ? accent : 'transparent',
                  border: `1px solid ${active ? accent : T.hairline}`,
                  borderRadius: 20,
                  padding: '7px 13px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: active ? '#0A0A0F' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
                {f.count > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: active ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{error}</div>
              <button
                type="button"
                onClick={load}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 28px' }}>
              <div style={{ fontWeight:700,fontFamily:T.serif, fontSize:17,letterSpacing:'-0.02em', color:T.text, marginBottom: 8 }}>
                {filter === 'spam' ? 'No spam' : filter === 'unread' ? 'All caught up' : filter === 'requests' ? 'No requests' : 'No conversations yet'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                {filter === 'all' ? 'Message a friend from their profile to start.' : 'Nothing in this filter.'}
              </div>
            </div>
          ) : (
            filtered.map((c, i) => {
              const dot = CHAT_UNREAD_DOTS[i % CHAT_UNREAD_DOTS.length];
              const isUnread = !!c.unread;
              const isSpam = spamIds.includes(c.peer_id);
              let preview = c.last_text || 'Tap to open';
              if (typeof preview === 'string' && preview.trim().startsWith('{') && preview.includes('"kind"')) {
                try {
                  const p = JSON.parse(preview);
                  preview = p.kind === 'end' ? 'Call ended' : p.kind === 'offer' ? (p.callType === 'video' ? 'Video call' : 'Audio call') : 'Call';
                } catch { preview = 'Call'; }
              }
              return (
                <div
                  key={c.peer_id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  {/* Avatar → profile */}
                  <button
                    type="button"
                    onClick={() => onOpenProfile && onOpenProfile(c.peer_id)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      overflow: 'visible',
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: `linear-gradient(145deg, ${dot}55, rgba(255,255,255,0.08))`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.85)' }}>
                          {(c.display_name || c.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isUnread && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#22C55E',
                          border: '2px solid #0B0B10',
                        }}
                      />
                    )}
                  </button>

                  {/* Open chat */}
                  <button
                    type="button"
                    onClick={() =>
                      onOpenChat &&
                      onOpenChat({
                        user_id: c.peer_id,
                        username: c.username,
                        display_name: c.display_name,
                        avatar_url: c.avatar_url,
                      })
                    }
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3, gap: 8 }}>
                      <span
                        style={{
                          fontFamily: T.serif, letterSpacing: '-0.02em',
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.95)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {c.display_name || c.username || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 11.5, color: isUnread ? accent : 'rgba(255,255,255,0.32)', fontWeight: isUnread ? 700 : 500, flexShrink: 0 }}>
                        {timeAgo(c.last_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: isUnread ? 600 : 400,
                          color: isUnread ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {isSpam ? 'Marked as spam' : c.is_request ? 'Message request' : <>{c.from_me ? 'You: ' : ''}{preview}</>}
                      </span>
                      {isUnread && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }}/>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSpam(c.peer_id)}
                    title={isSpam ? 'Unflag' : 'Flag spam'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isSpam ? '#E50914' : 'rgba(255,255,255,0.25)',
                      cursor: 'pointer',
                      fontSize: 16,
                      padding: '4px 2px',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ···
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
