'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { AccentGlow, Eyebrow, SvgIcon, T, ambient } from './shared';

export function ListPlaylistPlayer({ listId, movies, startIndex = 0, onClose, accent, onSave, watchlistIds }) {
  const { isSignedIn, user } = useUser();
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(true);
  const [showQueue, setShowQueue] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [shareToast, setShareToast] = useState(null);
  const [iframeReady, setIframeReady] = useState(false);
  const current = movies[currentIdx];

  useEffect(() => {
    if (!current?.movie_id) return;
    setLoadingTrailer(true);
    setTrailerKey(null);
    setIframeReady(false);
    const mediaType = current.is_tv ? 'tv' : 'movie';
    fetch(`/api/trailer?id=${current.movie_id}&type=${mediaType}`)
      .then((r) => r.json())
      .then((d) => {
        setTrailerKey(d.trailerKey || null);
        setLoadingTrailer(false);
      })
      .catch(() => setLoadingTrailer(false));
  }, [currentIdx, current?.movie_id]);

  useEffect(() => {
    if (!listId) return;
    setLoadingComments(true);
    fetch(`/api/reviews?listId=${listId}`)
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments || []);
        setLoadingComments(false);
      })
      .catch(() => setLoadingComments(false));
  }, [listId]);

  const goNext = () => {
    if (currentIdx < movies.length - 1) setCurrentIdx((p) => p + 1);
    else onClose();
  };
  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx((p) => p - 1);
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const postComment = async () => {
    if (!commentInput.trim() || !isSignedIn || !listId) return;
    setPostingComment(true);
    const parentId = replyingTo ? replyingTo.id : null;
    const text = commentInput.trim();
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, text, rating: 0, parentId }),
      });
      const data = await res.json();
      if (data.comment) {
        const comment = { ...data.comment, isSelf: true };
        if (parentId) {
          setComments((p) =>
            p.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...(c.replies || []), comment] }
                : c
            )
          );
        } else {
          setComments((p) => [comment, ...p]);
        }
        setCommentInput('');
        setReplyingTo(null);
      }
    } catch {}
    setPostingComment(false);
  };

  const deleteComment = async (id, parentId) => {
    setComments((p) => {
      if (parentId) {
        return p.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies || []).filter((r) => r.id !== id) }
            : c
        );
      }
      return p.filter((c) => c.id !== id);
    });
    try {
      await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {}
  };

  const startReply = (c) => {
    if (!isSignedIn) return;
    setReplyingTo(c);
  };

  const handleShare = async () => {
    const title = current?.movie_title || 'CineScroll';
    const url = typeof window !== 'undefined' ? window.location.href : 'https://this-scine.vercel.app';
    const text = listId
      ? `Watching "${title}" on a CineScroll list`
      : `Check out "${title}" on CineScroll`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareToast('Link copied');
        setTimeout(() => setShareToast(null), 2000);
      }
    } catch {}
  };

    if (!current) return null;
  const accent2 = current.movie_accent || accent;

  // YouTube always shows some chrome; this is as clean as their embed API allows
  const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  const embedSrc = trailerKey
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1&controls=1&iv_load_policy=3&fs=1&color=white&origin=${origin}`
    : null;
  const showSpinner = loadingTrailer || (!!trailerKey && !iframeReady);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: ambient(accent),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'playerSlideUp 0.38s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {shareToast && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 220,
            background: 'rgba(5,5,12,0.96)',
            border: `1px solid ${accent2}44`,
            borderRadius: 20,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            whiteSpace: 'nowrap',
          }}
        >
          {shareToast}
        </div>
      )}

      {/* VIDEO AREA — sticky so playback continues while queue/comments scroll */}
      <div style={{ position: 'relative', zIndex: 12, width: '100%', paddingBottom: '56.25%', background: '#000', flexShrink: 0, overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.5)' }}>
        {embedSrc && (
          <iframe
            key={trailerKey}
            src={embedSrc}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            frameBorder="0"
            onLoad={() => setIframeReady(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: iframeReady ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
            title={current.movie_title}
          />
        )}
        {showSpinner && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
              background: '#000',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                border: `2px solid rgba(255,255,255,0.1)`,
                borderTop: `2px solid ${accent2}`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Loading...</span>
          </div>
        )}
        {!loadingTrailer && !trailerKey && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <SvgIcon name="play" size={32} color="rgba(255,255,255,0.2)" filled />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No trailer available</div>
            <button
              onClick={goNext}
              style={{
                background: accent2,
                border: 'none',
                borderRadius: 20,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: '#07070F',
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Next film →
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 5 }}>
          {movies.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                height: 3,
                width: i === currentIdx ? 18 : 6,
                borderRadius: 2,
                background: i === currentIdx ? accent2 : i < currentIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* CONTROLS + COMMENTS — scrolls under sticky player */}
      <div style={{ flex: 1, minHeight: 0, background: 'transparent', display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: '16px 18px 12px', position: 'relative', overflow: 'hidden' }}>
          <AccentGlow accent={accent2} size={150} style={{ right: -30, top: -40 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ width: 48, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: T.surface2 }}>
              {current.movie_poster && (
                <img src={current.movie_poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: T.text,
                  fontFamily: T.serif, letterSpacing: '-0.02em',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {current.movie_title}
              </div>
              <div style={{ fontSize: 12, color: T.text3, marginBottom: 8 }}>
                {current.movie_year}
                {current.movie_rating ? `  ★ ${current.movie_rating}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    onSave &&
                    onSave({
                      id: current.movie_id,
                      title: current.movie_title,
                      poster: current.movie_poster,
                      year: current.movie_year,
                      rating: current.movie_rating,
                      accent: current.movie_accent,
                      isTV: current.is_tv,
                    })
                  }
                  style={{
                    background: watchlistIds?.has(current.movie_id) ? `${accent2}18` : T.surface2,
                    border: `1px solid ${watchlistIds?.has(current.movie_id) ? accent2 + '40' : T.hairline}`,
                    borderRadius: 20,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'inherit',
                  }}
                >
                  <SvgIcon
                    name={watchlistIds?.has(current.movie_id) ? 'check' : 'plus'}
                    size={10}
                    color={watchlistIds?.has(current.movie_id) ? accent2 : T.text2}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: watchlistIds?.has(current.movie_id) ? accent2 : T.text2 }}>
                    {watchlistIds?.has(current.movie_id) ? 'Saved' : 'Save'}
                  </span>
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    background: T.surface2,
                    border: `1px solid ${T.hairline}`,
                    borderRadius: 20,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'inherit',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>Share</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              style={{
                flex: 1,
                background: T.surface2,
                border: `1px solid ${T.hairline}`,
                borderRadius: 14,
                padding: '11px',
                cursor: currentIdx === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                opacity: currentIdx === 0 ? 0.35 : 1,
                fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Prev</span>
            </button>
            <button
              onClick={() => setShowQueue((p) => !p)}
              style={{
                background: showQueue ? `${accent2}18` : T.surface2,
                border: `1px solid ${showQueue ? accent2 + '40' : T.hairline}`,
                borderRadius: 14,
                padding: '11px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <SvgIcon name="list" size={14} color={showQueue ? accent2 : T.text2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: showQueue ? accent2 : T.text2 }}>
                {currentIdx + 1}/{movies.length}
              </span>
            </button>
            <button
              onClick={goNext}
              disabled={currentIdx === movies.length - 1}
              style={{
                flex: 1,
                background: currentIdx < movies.length - 1 ? accent2 : T.surface2,
                border: 'none',
                borderRadius: 14,
                padding: '11px',
                cursor: currentIdx === movies.length - 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                opacity: currentIdx === movies.length - 1 ? 0.35 : 1,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: currentIdx < movies.length - 1 ? '#07070F' : T.text2 }}>
                Next
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={currentIdx < movies.length - 1 ? '#07070F' : T.text2}
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {showQueue && (
          <div style={{ padding: '0 18px 16px', animation: 'fadeIn 0.2s ease' }}>
            <Eyebrow color={T.text3} style={{ marginBottom: 10, paddingTop: 4 }}>
              Up Next
            </Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {movies.map((m, i) => (
                <button
                  key={m.movie_id}
                  onClick={() => setCurrentIdx(i)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none',
                    padding: '11px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    opacity: i < currentIdx ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: i === currentIdx ? accent2 : i < currentIdx ? T.hairlineStrong : 'transparent',
                      border: i === currentIdx ? 'none' : `1px solid ${T.hairlineStrong}`,
                      transition: 'all 0.2s',
                    }}
                  />
                  <div style={{ width: 38, height: 52, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: T.surface2 }}>
                    {m.movie_poster && (
                      <img
                        src={m.movie_poster}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: i < currentIdx ? 0.4 : 1 }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: i === currentIdx ? 700 : 500,
                        color: i === currentIdx ? accent2 : T.text,
                        fontFamily: T.serif, letterSpacing: '-0.02em',
                        marginBottom: 2,
                      }}
                    >
                      {m.movie_title}
                    </div>
                    <div style={{ fontSize: 10, color: T.text3 }}>
                      {m.movie_year}
                      {m.movie_rating ? ` · ★${m.movie_rating}` : ''}
                    </div>
                  </div>
                  {i === currentIdx && <SvgIcon name="play" size={12} color={accent2} filled />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DISCUSSION: comments list first, input pinned at bottom */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: `1px solid ${T.hairline}`,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 180,
          }}
        >
          <div style={{ padding: '12px 18px 8px' }}>
            <Eyebrow color={T.text3}>Discussion</Eyebrow>
          </div>

          <div style={{ flex: 1, padding: '0 18px', maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {loadingComments ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: `2px solid rgba(255,255,255,0.1)`,
                    borderTop: `2px solid ${accent2}`,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            ) : comments.length === 0 ? (
              <div style={{ fontSize: 12.5, color: T.text3, textAlign: 'center', padding: '16px 0 8px' }}>
                No comments yet — start the discussion!
              </div>
            ) : (
              comments.map((c, i) => {
                const isSelf = c.isSelf || (user && c.user_id === user.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '12px 0',
                      borderTop: i > 0 ? `1px solid ${T.hairline}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `${accent2}18`,
                          border: `1px solid ${accent2}38`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: accent2,
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (c.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Comment body ABOVE username */}
                        <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.5, margin: '0 0 5px' }}>{c.text}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>@{c.username}</span>
                          <span style={{ fontSize: 10, color: T.text3 }}>{timeAgo(c.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => startReply(c)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <SvgIcon name="reply" size={12} color={T.text3} />
                            <span style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>Reply</span>
                          </button>
                          {isSelf && (
                            <button
                              type="button"
                              onClick={() => deleteComment(c.id, null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
                            >
                              <SvgIcon name="trash" size={12} color={T.text3} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {(c.replies || []).map((r) => {
                      const rSelf = r.isSelf || (user && r.user_id === user.id);
                      return (
                        <div key={r.id} style={{ display: 'flex', gap: 10, marginTop: 10, marginLeft: 38 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: T.surface2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.text2,
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (r.username || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, margin: '0 0 4px' }}>{r.text}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>@{r.username}</span>
                              <span style={{ fontSize: 10, color: T.text3 }}>{timeAgo(r.created_at)}</span>
                              {rSelf && (
                                <button
                                  type="button"
                                  onClick={() => deleteComment(r.id, c.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}
                                >
                                  <SvgIcon name="trash" size={11} color={T.text3} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment box at the very bottom */}
          <div
            style={{
              padding: '10px 18px calc(12px + env(safe-area-inset-bottom, 0px))',
              borderTop: `1px solid ${T.hairline}`,
              background: 'rgba(6,6,11,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              flexShrink: 0,
            }}
          >
            {replyingTo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: T.text2 }}>
                <span>
                  Replying to <span style={{ color: accent2 }}>@{replyingTo.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setCommentInput(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, fontSize: 14, padding: 0 }}
                >
                  ×
                </button>
              </div>
            )}
            {isSignedIn ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Add a comment...'}
                  style={{
                    flex: 1,
                    background: T.surface2,
                    border: `1px solid ${replyingTo ? accent2 + '40' : T.hairline}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    color: T.text,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={postComment}
                  disabled={postingComment || !commentInput.trim()}
                  style={{
                    background: accent2,
                    border: 'none',
                    borderRadius: 12,
                    padding: '0 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#07070F',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    opacity: postingComment || !commentInput.trim() ? 0.5 : 1,
                  }}
                >
                  Post
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: T.text3, textAlign: 'center', padding: '6px 0' }}>
                Sign in to join the discussion
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
