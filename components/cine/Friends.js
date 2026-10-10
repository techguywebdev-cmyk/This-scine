'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { ChatWidget, FollowListModal, MessagesInbox, NotificationsPanel, StatusComposer, StatusViewer, SvgIcon, T, Toast, UserProfileSheet, ambient , track } from './shared';

// ─── FRIENDS SCREEN ───────────────────────────────────────────────────────────
export function FriendsScreen({ onClose, accent, onWatchTrailer, onAddToWatchlist }) {
  const { isSignedIn, user } = useUser();
  const [tab, setTab] = useState('feed'); // feed, following, find
  const [feedItems, setFeedItems] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [stats, setStats] = useState({ following: 0, followers: 0, pending: 0 });
  const [searchQ, setSearchQ] = useState('');
  const [friendsSearchQ, setFriendsSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [toast, setToast] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [chatPeer, setChatPeer] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteFriends = async () => {
    const handle = user?.username || user?.id;
    if (!handle) return;
    const url = `${window.location.origin}/u/${encodeURIComponent(handle)}`;
    const text = `Join me on CineScroll — let's see what we both want to watch 🍿`;
    track('share', { via: 'invite' });
    try { if (navigator.share) { await navigator.share({ title: 'CineScroll', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 1800); } catch {}
  };
  const [fabHidden, setFabHidden] = useState(false);
  const lastScrollY = useRef(0);
  const onFeedScroll = (e) => {
    const y = e.currentTarget.scrollTop; const d = y - lastScrollY.current;
    if (Math.abs(d) < 6) return;
    setFabHidden(d > 0 && y > 80);
    lastScrollY.current = y;
  };
  const [followListType, setFollowListType] = useState(null);
  const [savedHere, setSavedHere] = useState(() => new Set());
  const [heroPosters, setHeroPosters] = useState([]);
  const [statusPeople, setStatusPeople] = useState([]);
  const [composeStatus, setComposeStatus] = useState(false);
  const [viewStatusAt, setViewStatusAt] = useState(null);
  const loadStatuses = useCallback(() => {
    fetch('/api/status', { cache: 'no-store' }).then(r => r.json()).then(d => setStatusPeople(d.people || [])).catch(() => {});
  }, []);
  useEffect(() => { if (isSignedIn) loadStatuses(); }, [isSignedIn, loadStatuses]);
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // A fresh wall of posters every visit
  useEffect(() => {
    let alive = true;
    fetch('/api/movies?popular=1').then(r => r.json()).then(d => {
      if (!alive) return;
      const list = (d.movies || []).map(m => m.poster).filter(Boolean);
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      setHeroPosters(list.slice(0, 6));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/activity?type=feed')
      .then(r => r.json()).then(d => { setFeedItems(d.items || []); setLoadingFeed(false); })
      .catch(() => setLoadingFeed(false));
    fetch('/api/follows?type=following')
      .then(r => r.json()).then(d => { setFriends(d.users || []); setLoadingFriends(false); })
      .catch(() => setLoadingFriends(false));
    fetch('/api/follows?type=stats')
      .then(r => r.json()).then(d => { setStats(p => ({ ...p, following: d.following || 0, followers: d.followers || 0 })); })
      .catch(() => {});
    fetch('/api/messages')
      .then(r => r.json()).then(d => {
        const convs = d.conversations || [];
        setStats(p => ({ ...p, pending: convs.filter(c => c.unread).length }));
      }).catch(() => {});
    fetch('/api/follows?type=suggested')
      .then(r => r.json()).then(d => { setSuggested(d.users || []); setLoadingSuggested(false); })
      .catch(() => setLoadingSuggested(false));
    fetch('/api/leaderboard?type=watchlist')
      .then(r => r.json()).then(d => { setLeaders(d.leaders || []); setLoadingLeaders(false); })
      .catch(() => setLoadingLeaders(false));
    fetch('/api/notifications')
      .then(r => r.json()).then(d => { setNotifications(d.items || []); setLoadingNotifs(false); })
      .catch(() => setLoadingNotifs(false));
  }, [isSignedIn]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/follows?type=search&q=${encodeURIComponent(searchQ)}`);
        const data = await res.json();
        setSearchRes(data.users || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleFollow = async (targetUser) => {
    const isFollowing = targetUser.isFollowing;
    const flip = (u) => u.user_id === targetUser.user_id ? { ...u, isFollowing: !isFollowing } : u;
    setSearchRes(p => p.map(flip));
    setSuggested(p => p.map(flip));
    setLeaders(p => p.map(flip));
    if (isFollowing) {
      setFriends(p => p.filter(f => f.user_id !== targetUser.user_id));
      setStats(p => ({ ...p, following: Math.max(0, p.following - 1) }));
      await fetch('/api/follows', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: targetUser.user_id }) }).catch(() => {});
      showToast('Unfollowed');
    } else {
      setFriends(p => [{ ...targetUser, isFollowing: true }, ...p]);
      setStats(p => ({ ...p, following: p.following + 1 }));
      await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: targetUser.user_id }) }).catch(() => {});
      showToast(`Now following @${targetUser.username}`);
      // Pull their activity into the feed right away
      fetch('/api/activity?type=feed').then(r => r.json()).then(d => setFeedItems(d.items || [])).catch(() => {});
    }
  };

  const handleMarkRead = async (id) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  const handleFollowBack = async (notif) => {
    setNotifications(p => p.map(n => n.id === notif.id ? { ...n, followedBack: true } : n));
    setStats(p => ({ ...p, following: p.following + 1 }));
    await fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: notif.user_id }) }).catch(() => {});
    showToast(`Now following @${notif.username}`);
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d` : new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const VERB = {
    saved: 'saved', watched: 'watched', reviewed: 'reviewed',
    list_follow: 'followed the folder', arc_complete: 'finished the arc',
  };
  const isTitle = (t) => t === 'saved' || t === 'watched' || t === 'reviewed';

  const FILTERS = [
    { id: 'all', label: 'Everything' },
    { id: 'reviewed', label: 'Reviews' },
    { id: 'watched', label: 'Watched' },
    { id: 'saved', label: 'Saved' },
    { id: 'list_follow', label: 'Folders' },
    { id: 'arc_complete', label: 'Arcs' },
  ];

  // Friends who did something in the last 24h get a ring around their avatar
  const activeRecently = useMemo(() => {
    const cut = Date.now() - 86400000;
    const s = new Set();
    feedItems.forEach(i => { if (new Date(i.created_at).getTime() > cut) s.add(i.user_id); });
    return s;
  }, [feedItems]);

  // "Buzzing in your circle": titles more than one friend touched this week
  const buzzing = useMemo(() => {
    const cut = Date.now() - 7 * 86400000;
    const map = new Map();
    feedItems.forEach(i => {
      if (!isTitle(i.type) || !i.movie_id || new Date(i.created_at).getTime() < cut) return;
      const cur = map.get(i.movie_id) || { item: i, people: new Map() };
      if (!cur.people.has(i.user_id)) cur.people.set(i.user_id, i);
      map.set(i.movie_id, cur);
    });
    return [...map.values()].filter(x => x.people.size >= 2).sort((a, b) => b.people.size - a.people.size).slice(0, 10);
  }, [feedItems]);

  // Collapse bursts (same person, same action, within 3h) into one post with a poster strip
  const posts = useMemo(() => {
    const list = activityFilter === 'all' ? feedItems : feedItems.filter(i => i.type === activityFilter);
    const out = [];
    list.forEach(i => {
      const last = out[out.length - 1];
      if (last && last.user_id === i.user_id && last.type === i.type && i.type !== 'reviewed' && isTitle(i.type)
        && Math.abs(new Date(last.items[0].created_at) - new Date(i.created_at)) < 3 * 3600000) {
        last.items.push(i);
      } else {
        out.push({ key: i.id || `${i.user_id}-${i.created_at}`, user_id: i.user_id, type: i.type, items: [i] });
      }
    });
    return out;
  }, [feedItems, activityFilter]);

  // Organise the feed by person: one block per friend, their actions grouped by type
  const [personFilter, setPersonFilter] = useState(null);
  const people = useMemo(() => {
    let list = activityFilter === 'all' ? feedItems : feedItems.filter(i => i.type === activityFilter);
    if (personFilter) list = list.filter(i => i.user_id === personFilter);
    const map = new Map();
    list.forEach(i => {
      let p = map.get(i.user_id);
      if (!p) { p = { user_id: i.user_id, user: { user_id: i.user_id, username: i.username, avatar_url: i.avatar_url, display_name: i.display_name }, latest: i.created_at, groups: new Map() }; map.set(i.user_id, p); }
      if (new Date(i.created_at) > new Date(p.latest)) p.latest = i.created_at;
      const g = p.groups.get(i.type) || [];
      if (!(isTitle(i.type) && i.type !== 'reviewed' && g.some(x => x.movie_id === i.movie_id))) g.push(i);
      p.groups.set(i.type, g);
    });
    const ORDER = ['reviewed', 'watched', 'saved', 'list_follow', 'arc_complete'];
    return [...map.values()]
      .map(p => ({ ...p, groups: [...p.groups.entries()].sort((a, b) => (ORDER.indexOf(a[0]) + 99) % 99 - (ORDER.indexOf(b[0]) + 99) % 99).map(([type, items]) => ({ type, items: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) })) }))
      .sort((a, b) => new Date(b.latest) - new Date(a.latest));
  }, [feedItems, activityFilter, personFilter]);

  // Feed by action: each section is a row of people; tap a face to reveal what they did
  const [openPerson, setOpenPerson] = useState({});
  const sections = useMemo(() => {
    const ORDER = ['saved', 'watched', 'reviewed', 'list_follow', 'arc_complete'];
    return ORDER.map(type => ({
      type,
      people: people.map(p => ({ ...p, items: (p.groups.find(g => g.type === type) || {}).items || [] })).filter(p => p.items.length > 0),
    })).filter(sec => sec.people.length > 0);
  }, [people]);

  const dayLabel = (ts) => {
    const d = new Date(ts); const today = new Date();
    const diff = Math.floor((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return 'This week';
    return 'Earlier';
  };

  const toMovie = (it) => ({ id: it.movie_id, title: it.movie_title, poster: it.movie_poster, year: it.movie_year, rating: it.movie_rating, accent: it.movie_accent || accent, mediaType: 'movie' });
  const saveFromFeed = (it) => {
    onAddToWatchlist && onAddToWatchlist(toMovie(it));
    setSavedHere(p => new Set([...p, it.movie_id]));
    showToast(`Saved ${it.movie_title}`);
  };
  const openChat = (it) => setChatPeer({ user_id: it.user_id, username: it.username, avatar_url: it.avatar_url });

  const filteredFriends = friends.filter(f => !friendsSearchQ.trim() || `${f.username || ''} ${f.display_name || ''}`.toLowerCase().includes(friendsSearchQ.toLowerCase()));

  /* ── small building blocks ── */
  const Avatar = ({ u, size = 40, ring = false }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', padding: ring ? 2 : 0, background: ring ? accent : 'transparent', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: '50%', overflow: 'hidden', background: T.surface, border: ring ? `2px solid ${T.bg}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
        {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u?.display_name || u?.username || 'U')[0].toUpperCase()}
      </div>
    </div>
  );
  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  const H = ({ children, right, top = 28 }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: `${top}px 0 8px` }}>
      <span style={{  fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', fontWeight:700, color:accent }}>{children}</span>
      {right}
    </div>
  );
  const friendIds = new Set(friends.map(f => f.user_id));
  const FollowBtn = ({ u: raw }) => { const u = { ...raw, isFollowing: raw.isFollowing ?? friendIds.has(raw.user_id) }; return isSignedIn ? (
    <button onClick={(e) => { e.stopPropagation(); handleFollow(u); }}
      style={{ background: u.isFollowing ? 'transparent' : accent, border: `1px solid ${u.isFollowing ? 'rgba(255,255,255,0.2)' : accent}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: u.isFollowing ? 'rgba(255,255,255,0.75)' : '#06060B', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>
      {u.isFollowing ? 'Following' : 'Follow'}
    </button>
  ) : null; };
  const PersonRow = ({ u, meta, right }) => (
    <div role="button" tabIndex={0} onClick={() => setViewingProfile(u.user_id)} onKeyDown={(e) => e.key === 'Enter' && setViewingProfile(u.user_id)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
      <Avatar u={u} size={44} ring={activeRecently.has(u.user_id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username || 'User'}</span>
          {u.verified && <SvgIcon name="badgeCheck" size={13} color="#4DA8FF" filled />}
        </div>
        <div style={{ fontSize: 11, color:T.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta || `@${u.username || 'user'}`}</div>
      </div>
      {right}
    </div>
  );
  // plain function (not a component) so the input keeps focus while typing
  const underlineInput = (value, onChange, placeholder, autoFocus) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1.5px solid rgba(255,255,255,0.14)' }}>
      <SvgIcon name="search" size={17} color="rgba(255,255,255,0.5)" />
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13.5, fontFamily: 'inherit' }} />
      {value && <button onClick={() => onChange('')} aria-label="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><SvgIcon name="close" size={13} color="rgba(255,255,255,0.6)" /></button>}
    </div>
  );

  /* ── one post in the feed ── */
  const Post = ({ p }) => {
    const first = p.items[0];
    const many = p.items.length > 1;
    const who = { user_id: first.user_id, username: first.username, avatar_url: first.avatar_url, display_name: first.display_name };
    const name = first.display_name || first.username || 'Someone';
    return (
      <div style={{ display: 'flex', gap: 12, padding: '16px 0', borderTop: `1px solid ${T.hairline}` }}>
        <button onClick={() => setViewingProfile(first.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', alignSelf: 'flex-start' }} aria-label={`Open ${name}'s profile`}>
          <Avatar u={who} size={40} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color:'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            <button onClick={() => setViewingProfile(first.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{name}</button>
            {' '}{VERB[p.type] || 'shared'}{' '}
            {many ? <span style={{ color: '#fff', fontWeight: 600 }}>{p.items.length} titles</span> : <span style={{ color: '#fff', fontWeight: 600 }}>{first.movie_title}</span>}
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>  {timeAgo(first.created_at)}</span>
          </div>

          {/* Review text reads like a post */}
          {first.review_text && (
            <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.5, margin: '8px 0 0', paddingLeft: 12, borderLeft: `2px solid ${first.movie_accent || accent}` }}>{first.review_text}</p>
          )}

          {many ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {p.items.slice(0, 8).map(it => (
                <button key={it.id || it.movie_id} onClick={() => onWatchTrailer(toMovie(it))} aria-label={`Trailer for ${it.movie_title}`}
                  style={{ flexShrink: 0, width: 72, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: T.surface, border: 'none', padding: 0, cursor: 'pointer' }}>
                  {it.movie_poster && <img src={it.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </button>
              ))}
            </div>
          ) : first.movie_title && (
            <div role="button" tabIndex={0} onClick={() => isTitle(p.type) && onWatchTrailer({ ...toMovie(first), ...(p.type === 'reviewed' && first.review_id ? { initialTab: 'comments', highlightCommentId: first.review_id } : {}) })}
              style={{ display: 'flex', gap: 12, marginTop: 10, cursor: isTitle(p.type) ? 'pointer' : 'default' }}>
              <div style={{ width: 64, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: T.surface }}>
                {first.movie_poster && <img src={first.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{first.movie_title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color:T.text2, marginTop: 4 }}>
                  {first.movie_year && <span>{first.movie_year}</span>}
                  {first.movie_rating && <><span>·</span><SvgIcon name="star" size={10} color="#FFD166" filled /><span style={{ color: 'rgba(255,255,255,0.85)' }}>{first.movie_rating}</span></>}
                </div>
              </div>
            </div>
          )}

          {/* Actions: everything here does something real */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 12 }}>
            {isTitle(p.type) && !many && (
              <>
                <button onClick={() => onWatchTrailer(toMovie(first))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  <SvgIcon name="play" size={12} color="#fff" filled />Trailer
                </button>
                <button onClick={() => saveFromFeed(first)} disabled={savedHere.has(first.movie_id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: savedHere.has(first.movie_id) ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: savedHere.has(first.movie_id) ? accent : 'rgba(255,255,255,0.75)' }}>
                  <SvgIcon name="bookmark" size={14} color={savedHere.has(first.movie_id) ? accent : 'rgba(255,255,255,0.75)'} filled={savedHere.has(first.movie_id)} />{savedHere.has(first.movie_id) ? 'Saved' : 'Save'}
                </button>
              </>
            )}
            <button onClick={() => openChat(first)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
              <SvgIcon name="chat" size={14} color="rgba(255,255,255,0.75)" />{p.type === 'reviewed' ? 'Reply' : 'Message'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GROUP_LABEL = { saved: 'Saved', watched: 'Watched', reviewed: 'Reviewed', list_follow: 'Followed folders', arc_complete: 'Finished arcs' };
  const actionBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 };

  const SECTION = {
    saved: { title: 'Saves', verb: 'saved', icon: 'bookmark' },
    watched: { title: 'Watched', verb: 'watched', icon: 'eye' },
    reviewed: { title: 'Reviews', verb: 'reviewed', icon: 'chat' },
    list_follow: { title: 'Folders', verb: 'followed', icon: 'folder' },
    arc_complete: { title: 'Cine Arcs', verb: 'finished', icon: 'star' },
  };
  const ActionSection = ({ sec }) => {
    const meta = SECTION[sec.type] || { title: 'Activity', verb: 'shared' };
    const openId = openPerson[sec.type];
    const open = sec.people.find(p => p.user_id === openId);
    const titles = sec.people.reduce((n, p) => n + p.items.length, 0);
    const toggle = (id) => setOpenPerson(cur => ({ ...cur, [sec.type]: cur[sec.type] === id ? null : id }));
    return (
      <div style={{ padding: '20px 0 18px', borderTop: `1px solid ${T.hairline}` }}>
        <span style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent }}>{meta.title}</span>

        {/* Faces — overlapping stack, tap one to reveal */}
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', margin: '14px -20px 0', padding: '6px 20px 6px 23px' }}>
          {sec.people.map((p, i) => {
            const on = openId === p.user_id;
            const nm = p.user.display_name || p.user.username || 'User';
            return (
              <button key={p.user_id} onClick={() => toggle(p.user_id)} aria-expanded={on} aria-label={`${nm} ${meta.verb} ${p.items.length}`} title={nm}
                style={{ flexShrink: 0, marginLeft: i ? -13 : 0, position: 'relative', zIndex: on ? sec.people.length + 1 : sec.people.length - i, background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', transform: on ? 'translateY(-3px) scale(1.06)' : 'none', opacity: openId && !on ? 0.5 : 1, transition: 'transform .2s, opacity .2s' }}>
                <div style={{ borderRadius: '50%', boxShadow: on ? `0 0 0 3px #0B0B12, 0 0 0 5px ${accent}` : '0 0 0 3px #0B0B12' }}>
                  <Avatar u={p.user} size={50} />
                </div>
              </button>
            );
          })}
        </div>


        {/* Revealed */}
        {open && (() => {
          const nm = open.user.display_name || open.user.username || 'User';
          return (
            <div style={{ marginTop: 14, animation: 'revealIn .25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <button onClick={() => setViewingProfile(open.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{nm}</span>
                  <span style={{ fontSize: 11.5, color: T.text2 }}>  @{open.user.username || 'user'} · {timeAgo(open.items[0].created_at)}</span>
                </button>
                <button onClick={() => openChat({ user_id: open.user_id, username: open.user.username, avatar_url: open.user.avatar_url })} style={{ ...actionBtn, color: 'rgba(255,255,255,0.75)', flexShrink: 0 }}>
                  <SvgIcon name="chat" size={13} color="rgba(255,255,255,0.75)" />Message
                </button>
              </div>

              {sec.type === 'reviewed' ? open.items.slice(0, 5).map(it => (
                <div key={it.id || it.movie_id} role="button" tabIndex={0} onClick={() => onWatchTrailer({ ...toMovie(it), ...(it.review_id ? { initialTab: 'comments', highlightCommentId: it.review_id } : {}) })} style={{ display: 'flex', gap: 12, marginTop: 12, cursor: 'pointer' }}>
                  <div style={{ width: 48, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: T.surface }}>
                    {it.movie_poster && <img src={it.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{it.movie_title}</div>
                    {it.review_text && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.review_text}</div>}
                  </div>
                </div>
              )) : isTitle(sec.type) ? (
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', margin: '12px -20px 0', padding: '0 20px' }}>
                  {open.items.slice(0, 20).map(it => (
                    <div key={it.id || it.movie_id} style={{ flexShrink: 0, width: 96 }}>
                      <button onClick={() => onWatchTrailer(toMovie(it))} aria-label={`Trailer for ${it.movie_title}`} style={{ display: 'block', width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: T.surface, border: 'none', padding: 0, cursor: 'pointer', position: 'relative' }}>
                        {it.movie_poster && <img src={it.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </button>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.movie_title}</div>
<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                            <button onClick={() => saveFromFeed(it)} disabled={savedHere.has(it.movie_id)} style={{ ...actionBtn, fontSize: 11,  color: savedHere.has(it.movie_id) ? accent : 'rgba(255,255,255,0.6)', cursor: savedHere.has(it.movie_id) ? 'default' : 'pointer' }}>
                        <SvgIcon name="bookmark" size={11} color={savedHere.has(it.movie_id) ? accent : 'rgba(255,255,255,0.6)'} filled={savedHere.has(it.movie_id)} />{savedHere.has(it.movie_id) ? 'Saved' : 'Save'}
                      </button>
                      <button onClick={() => window.dispatchEvent(new CustomEvent('cine:watch-with', { detail: { movie: toMovie(it) } }))} aria-label={`Watch ${it.movie_title} with a friend`} style={{ ...actionBtn, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>🍿 Watch</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : open.items.slice(0, 6).map(it => (
                <div key={it.id || `${it.type}-${it.created_at}`} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', padding: '10px 0 0' }}>{it.movie_title || 'Something new'}</div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  };

  const PersonBlock = ({ p }) => {
    const u = p.user;
    const name = u.display_name || u.username || 'Someone';
    const total = p.groups.reduce((n, g) => n + g.items.length, 0);
    return (
      <div style={{ padding: '18px 0 20px', borderTop: `1px solid ${T.hairline}` }}>
        {/* Who */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setViewingProfile(p.user_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label={`Open ${name}'s profile`}>
            <Avatar u={u} size={42} ring={activeRecently.has(p.user_id)} />
          </button>
          <button onClick={() => setViewingProfile(p.user_id)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 11.5, color: T.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username || 'user'} · active {timeAgo(p.latest)}{timeAgo(p.latest) === 'now' ? '' : ' ago'}</div>
          </button>
          <button onClick={() => openChat({ user_id: p.user_id, username: u.username, avatar_url: u.avatar_url })} aria-label={`Message ${name}`} style={{ background: 'none', border: `1px solid ${T.hairline}`, borderRadius: 18, height: 32, padding: '0 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}>
            <SvgIcon name="chat" size={13} color="rgba(255,255,255,0.8)" />Message
          </button>
        </div>

        {/* What they did, grouped */}
        <div style={{ marginLeft: 54 }}>
          {p.groups.map(g => {
            const first = g.items[0];
            return (
              <div key={g.type} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 700, color: accent }}>{GROUP_LABEL[g.type] || 'Shared'}</span>
                  <span style={{ fontSize: 11, color: T.text3 }}>{g.items.length > 1 ? `${g.items.length} · ` : ''}{timeAgo(first.created_at)}</span>
                </div>

                {g.type === 'reviewed' ? (
                  g.items.slice(0, 2).map(it => (
                    <div key={it.id || it.movie_id} role="button" tabIndex={0} onClick={() => onWatchTrailer({ ...toMovie(it), ...(it.review_id ? { initialTab: 'comments', highlightCommentId: it.review_id } : {}) })} style={{ display: 'flex', gap: 12, marginTop: 10, cursor: 'pointer' }}>
                      <div style={{ width: 48, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: T.surface }}>
                        {it.movie_poster && <img src={it.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{it.movie_title}{it.review_rating ? <span style={{ marginLeft: 6, fontSize: 11.5, color: '#FFD166' }}>★ {it.review_rating}</span> : null}</div>
                        {it.review_text && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.review_text}</div>}
                      </div>
                    </div>
                  ))
                ) : isTitle(g.type) && g.items.length === 1 ? (
                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <div role="button" tabIndex={0} onClick={() => onWatchTrailer(toMovie(first))} style={{ width: 56, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: T.surface, cursor: 'pointer' }}>
                      {first.movie_poster && <img src={first.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>{first.movie_title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.text2, marginTop: 4 }}>
                        {first.movie_year && <span>{first.movie_year}</span>}
                        {first.movie_rating && <><span>·</span><SvgIcon name="star" size={10} color="#FFD166" filled /><span style={{ color: 'rgba(255,255,255,0.85)' }}>{first.movie_rating}</span></>}
                      </div>
                      <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
                        <button onClick={() => onWatchTrailer(toMovie(first))} style={{ ...actionBtn, color: '#fff' }}><SvgIcon name="play" size={11} color="#fff" filled />Trailer</button>
                        <button onClick={() => saveFromFeed(first)} disabled={savedHere.has(first.movie_id)} style={{ ...actionBtn, color: savedHere.has(first.movie_id) ? accent : 'rgba(255,255,255,0.75)', cursor: savedHere.has(first.movie_id) ? 'default' : 'pointer' }}>
                          <SvgIcon name="bookmark" size={13} color={savedHere.has(first.movie_id) ? accent : 'rgba(255,255,255,0.75)'} filled={savedHere.has(first.movie_id)} />{savedHere.has(first.movie_id) ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isTitle(g.type) ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', scrollbarWidth: 'none', marginRight: -20, paddingRight: 20 }}>
                    {g.items.slice(0, 12).map(it => (
                      <button key={it.id || it.movie_id} onClick={() => onWatchTrailer(toMovie(it))} aria-label={it.movie_title} style={{ flexShrink: 0, width: 76, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: T.surface }}>
                          {it.movie_poster && <img src={it.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.movie_title}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  g.items.slice(0, 3).map(it => (
                    <div key={it.id || `${it.type}-${it.created_at}`} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>{it.movie_title || it.list_title || it.arc_title || 'Something new'}</div>
                  ))
                )}
              </div>
            );
          })}
          {total > 0 && p.groups.some(g => g.items.length > 12) && (
            <button onClick={() => setViewingProfile(p.user_id)} style={{ ...actionBtn, color: accent, marginTop: 12 }}>See all on {name.split(' ')[0]}'s profile</button>
          )}
        </div>
      </div>
    );
  };

  let lastDay = null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background:ambient(accent), display: 'flex', flexDirection: 'column', animation: 'playerSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes revealIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}div::-webkit-scrollbar{display:none}input::placeholder{color:rgba(255,255,255,0.35)}`}</style>
      {toast && <Toast message={toast} accent={accent} />}
      {composeStatus && <StatusComposer accent={accent} onClose={() => setComposeStatus(false)} onPosted={() => { loadStatuses(); showToast('Status posted · visible for 24 hours'); }} />}
      {viewStatusAt != null && statusPeople[viewStatusAt] && <StatusViewer people={statusPeople} startIndex={viewStatusAt} accent={accent} onClose={() => { setViewStatusAt(null); loadStatuses(); }} onChanged={() => {}} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} accent={accent} notifications={notifications} loading={loadingNotifs} onMarkRead={handleMarkRead} onFollowBack={handleFollowBack} onOpenChat={(p) => setChatPeer(p)} />}
      {chatPeer && <ChatWidget peer={chatPeer} onClose={() => { const back = chatPeer?.fromMessages; setChatPeer(null); if (back) setShowMessages(true); }} accent={accent} />}
      {showMessages && (
        <MessagesInbox onClose={() => setShowMessages(false)} accent={accent}
          onOpenChat={(p) => { setShowMessages(false); setChatPeer({ ...p, fromMessages: true }); }}
          onOpenProfile={(id) => { setShowMessages(false); setViewingProfile(id); }} />
      )}
      {followListType && (
        <FollowListModal targetUserId={user?.id} type={followListType} onClose={() => setFollowListType(null)} accent={accent}
          onSelectUser={(id) => { setFollowListType(null); setViewingProfile(id); }} />
      )}
      {viewingProfile && <UserProfileSheet userId={viewingProfile} onClose={() => setViewingProfile(null)} accent={accent} onWatchTrailer={onWatchTrailer} onAddToWatchlist={onAddToWatchlist} />}

      {/* Floating chat — bottom-right, slides away while scrolling down */}
      {isSignedIn && !showMessages && !chatPeer && !composeStatus && viewStatusAt == null && !showNotifs && !viewingProfile && !followListType && (
        <button onClick={() => setShowMessages(true)} aria-label={stats.pending > 0 ? `Messages, ${stats.pending} unread` : 'Messages'}
          style={{ position: 'absolute', right: 18, bottom: 'calc(22px + env(safe-area-inset-bottom))', zIndex: 5, width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: fabHidden ? 'translateY(120px)' : 'translateY(0)', opacity: fabHidden ? 0 : 1, transition: 'transform .3s cubic-bezier(0.22,1,0.36,1), opacity .25s' }}>
          <SvgIcon name="chat" size={23} color="#fff" />
          {stats.pending > 0 && <span style={{ position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, background: accent, border: '2px solid #0B0B12', color: '#06060B', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxSizing: 'border-box' }}>{stats.pending > 99 ? '99+' : stats.pending}</span>}
        </button>
      )}

      {/* Header */}
      <div style={{ position: 'relative', padding: 'max(18px, env(safe-area-inset-top)) 20px 0', flexShrink: 0 }}>
        {/* Poster wall — reshuffled on every visit */}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 'calc(190px + env(safe-area-inset-top))', overflow: 'hidden', pointerEvents: 'none', WebkitMaskImage: 'linear-gradient(to bottom,#000 55%,transparent 100%)', maskImage: 'linear-gradient(to bottom,#000 55%,transparent 100%)' }}>
          <div style={{ position: 'absolute', left: -18, right: -18, top: -34, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, transform: 'rotate(-4deg)' }}>
            {(heroPosters.length ? heroPosters.slice(0, 5) : Array(5).fill(null)).map((src, i) => (
              <div key={i} style={{ aspectRatio: '2/3', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', transform: `translateY(${i % 2 ? 22 : 0}px)` }}>
                {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'revealIn .6s ease' }} />}
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0.35) 0%, rgba(6,6,11,0.1) 40%, rgba(6,6,11,0.55) 100%)' }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onClose} aria-label="Back" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: 'none', borderRadius: '50%', width: 36, height: 36, marginLeft: -4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowNotifs(true)} aria-label="Notifications" style={{ position: 'relative', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: '50%', marginLeft: 6, border: 'none', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SvgIcon name="bell" size={20} color="#fff" />
            {unreadCount > 0 && <span style={{ position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: accent, color: '#06060B', fontSize: 10, fontWeight:700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCount}</span>}
          </button>
        </div>
        <h1 style={{ position: 'relative', fontFamily: T.serif, fontSize: 26, letterSpacing: '-0.02em', fontWeight: 800, color: '#fff', margin: '78px 0 0', textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}>Friends</h1>
        <div style={{ position: 'relative', fontSize: 12, color:T.text2, marginTop: 2 }}>
          <button onClick={() => setFollowListType('followers')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color:T.text2 }}><b style={{ color: '#fff' }}>{stats.followers}</b> followers</button>
          <span style={{ margin: '0 8px' }}>·</span>
          <button onClick={() => setFollowListType('following')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color:T.text2 }}><b style={{ color: '#fff' }}>{stats.following}</b> following</button>
        </div>

        {/* Tabs */}
        <div style={{ position: 'relative', display: 'flex', gap: 24, marginTop: 16, borderBottom: `1px solid ${T.hairline}` }}>
          {[['feed', 'Feed'], ['following', 'Following'], ['find', 'Find people']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? accent : 'transparent'}`, marginBottom: -1, padding: '0 0 11px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? accent : 'rgba(255,255,255,0.5)' }}>{label}</button>
          ))}
        </div>
      </div>

      <div onScroll={onFeedScroll} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', padding: '0 20px calc(110px + env(safe-area-inset-bottom))' }}>
        {!isSignedIn ? (
          <div style={{ textAlign: 'center', padding: '56px 12px' }}>
            <div style={{ fontFamily:T.serif, fontSize:14,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>See what your friends are watching</div>
            <div style={{ fontSize: 12.5, color:T.text2, marginTop: 8, lineHeight: 1.5 }}>Sign in to follow people, see their saves and reviews, and message them about a film.</div>
          </div>
        ) : (
          <>
            {/* ─── FEED ─── */}
            {tab === 'feed' && (
              loadingFeed ? <Spinner /> : (
                <>
                  {/* Status + your circle */}
                  {(() => {
                    const mine = statusPeople.find(p => p.isSelf);
                    const others = statusPeople.filter(p => !p.isSelf);
                    const ringStyle = (unseen) => ({ padding: 2.5, borderRadius: '50%', background: unseen ? `conic-gradient(${accent}, #FF6B8A, ${accent})` : 'rgba(255,255,255,0.28)' });
                    const label = { fontSize: 11, width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
                    return (
                      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '18px 20px 4px' }}>
                        {/* You */}
                        <div style={{ flexShrink: 0, width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                          <button onClick={() => mine ? setViewStatusAt(statusPeople.indexOf(mine)) : setComposeStatus(true)} aria-label={mine ? 'View your status' : 'Add a status'} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                            <div style={mine ? ringStyle(false) : { padding: 2.5 }}>
                              <div style={{ border: `2px solid ${T.bg}`, borderRadius: '50%' }}><Avatar u={{ avatar_url: user?.imageUrl, username: user?.username || user?.firstName }} size={54} /></div>
                            </div>
                          </button>
                          <button onClick={() => setComposeStatus(true)} aria-label="Add a status" style={{ position: 'absolute', right: 2, top: 42, width: 22, height: 22, borderRadius: '50%', background: accent, border: `2px solid ${T.bg}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><SvgIcon name="plus" size={12} color="#07070F" /></button>
                          <span style={{ ...label, color: '#fff', fontWeight: 600 }}>{mine ? 'Your status' : 'Add status'}</span>
                        </div>
                        {/* Friends with a status */}
                        {others.map(p => (
                          <button key={p.user_id} onClick={() => setViewStatusAt(statusPeople.indexOf(p))} style={{ flexShrink: 0, width: 64, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={ringStyle(!p.allSeen)}><div style={{ border: `2px solid ${T.bg}`, borderRadius: '50%' }}><Avatar u={p} size={54} /></div></div>
                            <span style={{ ...label, color: p.allSeen ? 'rgba(255,255,255,0.6)' : '#fff', fontWeight: p.allSeen ? 400 : 700 }}>{(p.display_name || p.username || '').split(' ')[0]}</span>
                          </button>
                        ))}
                        <button onClick={() => setTab('find')} style={{ flexShrink: 0, width: 64, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 59, height: 59, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="userPlus" size={18} color="#fff" /></div>
                          <span style={{ ...label, color: 'rgba(255,255,255,0.6)' }}>Find</span>
                        </button>
                        <button onClick={inviteFriends} style={{ flexShrink: 0, width: 64, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 59, height: 59, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="share" size={17} color="#fff" /></div>
                          <span style={{ ...label, color: 'rgba(255,255,255,0.6)' }}>{inviteCopied ? 'Copied' : 'Invite'}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Buzzing in your circle */}
                  {buzzing.length > 0 && activityFilter === 'all' && (
                    <>
                      <H right={<span style={{ fontSize: 12, color:T.text2 }}>This week</span>}>Buzzing in your circle</H>
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '0 20px' }}>
                        {buzzing.map(({ item, people }) => (
                          <div key={item.movie_id} role="button" tabIndex={0} onClick={() => onWatchTrailer(toMovie(item))} style={{ flexShrink: 0, width: 118, cursor: 'pointer' }}>
                            <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: T.surface }}>
                              {item.movie_poster && <img src={item.movie_poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.movie_title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                              {[...people.values()].slice(0, 3).map((pp, k) => (
                                <div key={pp.user_id} style={{ marginLeft: k ? -7 : 0, border: `2px solid ${T.bg}`, borderRadius: '50%' }}><Avatar u={pp} size={20} /></div>
                              ))}
                              <span style={{ fontSize: 11, color:T.text2, marginLeft: 6 }}>{people.size} friends</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* People */}
                  {personFilter && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, fontSize: 12, color: T.text2 }}>
                      <span>Showing {(friends.find(f => f.user_id === personFilter)?.display_name) || (friends.find(f => f.user_id === personFilter)?.username) || 'one person'}</span>
                      <button onClick={() => setPersonFilter(null)} style={{ ...actionBtn, color: accent }}>Show everyone</button>
                    </div>
                  )}
                  {people.length === 0 ? (
                    stats.following === 0 || friends.length === 0 ? (
                      <div style={{ paddingTop: 22 }}>
                        <div style={{ fontFamily:T.serif, fontSize:14,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>Your feed fills up when you follow people</div>
                        <div style={{ fontSize: 12.5, color:T.text2, marginTop: 6, lineHeight: 1.5 }}>You’ll see what they save, watch and review here. Start with a few film lovers:</div>
                        <div style={{ marginTop: 12 }}>
                          {loadingSuggested ? <Spinner /> : suggested.slice(0, 6).map(u => <PersonRow key={u.user_id} u={u} meta={u.mutualCount > 0 ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`} right={<FollowBtn u={u} />} />)}
                        </div>
                        <button onClick={() => setTab('find')} style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: accent }}>Search for people</button>
                      </div>
                    ) : (
                      <div style={{ padding: '28px 0', fontSize: 12.5, color:T.text2 }}>
                        {activityFilter === 'all' ? 'Quiet for now. When the people you follow save or review something, it shows up here.' : 'Nothing like this from your friends yet.'}
                      </div>
                    )
                  ) : (
                    <div style={{ marginTop: 22 }}>{sections.map(sec => <ActionSection key={sec.type} sec={sec} />)}</div>
                  )}

                  {/* Keep growing the circle */}
                  {people.length > 0 && !personFilter && suggested.filter(u => !u.isFollowing).length > 0 && (
                    <>
                      <H right={<button onClick={() => setTab('find')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: accent }}>See all</button>}>People you may know</H>
                      {suggested.filter(u => !u.isFollowing).slice(0, 3).map(u => <PersonRow key={u.user_id} u={u} meta={u.mutualCount > 0 ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`} right={<FollowBtn u={u} />} />)}
                    </>
                  )}
                </>
              )
            )}

            {/* ─── FOLLOWING ─── */}
            {tab === 'following' && (
              <div style={{ paddingTop: 18 }}>
                {underlineInput(friendsSearchQ, setFriendsSearchQ, 'Search people you follow')}
                {loadingFriends ? <Spinner /> : filteredFriends.length === 0 ? (
                  <div style={{ padding: '28px 0' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{friendsSearchQ ? `No one called “${friendsSearchQ}”` : 'You’re not following anyone yet'}</div>
                    {!friendsSearchQ && <button onClick={() => setTab('find')} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: accent }}>Find people to follow</button>}
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    {filteredFriends.map(f => (
                      <PersonRow key={f.user_id} u={f}
                        meta={`${f.watchlistCount || 0} saved${f.topGenres?.length ? ` · into ${f.topGenres.slice(0, 2).join(', ')}` : ''}`}
                        right={
                          <button onClick={(e) => { e.stopPropagation(); setChatPeer({ user_id: f.user_id, username: f.username, avatar_url: f.avatar_url }); }}
                            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#fff', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>Message</button>
                        } />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── FIND PEOPLE ─── */}
            {tab === 'find' && (
              <div style={{ paddingTop: 18 }}>
                {underlineInput(searchQ, setSearchQ, 'Search by name or username', true)}
                {searching ? <Spinner /> : searchQ ? (
                  searchRes.length === 0 ? (
                    <div style={{ padding: '28px 0', fontSize: 12.5, color:T.text2 }}>No one found for “{searchQ}”. Check the spelling, or try their username.</div>
                  ) : (
                    <div style={{ marginTop: 8 }}>{searchRes.map(u => <PersonRow key={u.user_id} u={u} right={<FollowBtn u={u} />} />)}</div>
                  )
                ) : (
                  <>
                    <H top={24}>Suggested for you</H>
                    {loadingSuggested ? <Spinner /> : suggested.length === 0 ? (
                      <div style={{ fontSize: 12.5, color:T.text2, padding: '6px 0' }}>No suggestions right now.</div>
                    ) : suggested.map(u => <PersonRow key={u.user_id} u={u} meta={u.mutualCount > 0 ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`} right={<FollowBtn u={u} />} />)}

                    <H right={<span style={{ fontSize: 12, color:T.text2 }}>Biggest watchlists</span>}>Top curators</H>
                    {loadingLeaders ? <Spinner /> : leaders.length === 0 ? (
                      <div style={{ fontSize: 12.5, color:T.text2, padding: '6px 0' }}>No watchlists yet. Save a few titles and you could be first.</div>
                    ) : leaders.map(u => (
                      <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 22, fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: u.rank === 1 ? accent : 'rgba(255,255,255,0.35)' }}>{u.rank}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <PersonRow u={u} meta={`${u.watchlistCount} saved · @${u.username}`} right={u.user_id !== user?.id ? <FollowBtn u={u} /> : null} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
