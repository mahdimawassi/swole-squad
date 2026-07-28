'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import { usePrefetch } from './Nav';
import { goalLabel, emojiFor, prettyDate } from '@/lib/challenge';
import { detectPlatform } from '@/lib/social';
import type { User, Challenge, Member } from '@/lib/types';
import { INK, ARCHIVO, PAGE, card, btn, input, label } from '@/lib/ui';

export default function ChallengeAdmin({
  user,
  challenge,
  members,
}: {
  user: User;
  challenge: Challenge;
  members: Member[];
}) {
  const router = useRouter();
  const backToChallenge = `/me/${user.secret_token}/c/${challenge.id}`;
  usePrefetch([backToChallenge, `/me/${user.secret_token}`]);

  const [name, setName] = useState(challenge.name);
  const [goal, setGoal] = useState(String(challenge.goal_amount));
  const [end, setEnd] = useState(challenge.end_date);
  const [sharing, setSharing] = useState(challenge.sharing_enabled !== false);
  const [groupUrl, setGroupUrl] = useState(challenge.group_chat_url ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const groupPreview = detectPlatform(groupUrl);
  const goalNum = Number(goal);
  const detailsDirty =
    name.trim() !== challenge.name || goalNum !== challenge.goal_amount || end !== challenge.end_date;
  const detailsValid = name.trim().length > 0 && Number.isFinite(goalNum) && goalNum > 0 && Boolean(end);

  async function patch(payload: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/challenge/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not save.');
        return false;
      }
      setMsg(okMsg);
      router.refresh();
      return true;
    } catch {
      setErr('Network error. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleSharing() {
    const nextVal = !sharing;
    setSharing(nextVal);
    const ok = await patch({ sharing_enabled: nextVal }, nextVal ? 'Sharing on.' : 'Sharing off.');
    if (!ok) setSharing(!nextVal); // revert on failure
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/challenge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: user.secret_token, challenge_id: challenge.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Could not delete.');
        setBusy(false);
        setConfirmDelete(false);
        return;
      }
      router.push(`/me/${user.secret_token}`);
    } catch {
      setErr('Network error.');
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/join/${challenge.invite_code}`;

  return (
    <main style={PAGE}>
      <Header badge="ADMIN" back={backToChallenge} />

      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 26 }}>{emojiFor(challenge.activity)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: ARCHIVO, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {challenge.name}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
            {goalLabel(challenge)} · {members.length} in
          </div>
        </div>
      </div>

      {/* sharing toggle */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: ARCHIVO, fontSize: 15 }}>SHARING</div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>
            {sharing
              ? 'Anyone with the code or link can join.'
              : 'Locked. Current members stay, but nobody new can join.'}
          </div>
        </div>
        <button
          onClick={toggleSharing}
          disabled={busy}
          aria-label="Toggle sharing"
          className="nb"
          style={{
            width: 62,
            height: 34,
            borderRadius: 999,
            border: `3px solid ${INK}`,
            background: sharing ? '#37C871' : '#EFE6C6',
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: `3px 3px 0 ${INK}`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: sharing ? 30 : 2,
              width: 24,
              height: 24,
              borderRadius: 999,
              background: '#fff',
              border: `2px solid ${INK}`,
              transition: 'left .15s ease',
            }}
          />
        </button>
      </div>

      {/* group chat link */}
      <div style={card}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 15, marginBottom: 4 }}>GROUP CHAT</div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginBottom: 12 }}>
          Already have a group for this crew? Paste its invite link and everyone in the challenge gets a button
          to join it. WhatsApp, Telegram, Instagram, Discord, Signal, whatever you use.
        </div>
        <input
          value={groupUrl}
          onChange={(e) => setGroupUrl(e.target.value)}
          placeholder="https://chat.whatsapp.com/…"
          maxLength={400}
          style={{ ...input, marginBottom: 8 }}
        />
        {groupPreview && (
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
            {groupPreview.emoji} Detected: {groupPreview.label}
          </div>
        )}
        {!groupPreview && groupUrl.trim() !== '' && (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#C21F3A', marginBottom: 10 }}>
            That does not look like a link yet.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => patch({ group_chat_url: groupUrl.trim() }, groupUrl.trim() ? 'Group chat linked.' : 'Group chat removed.')}
            disabled={busy || groupUrl.trim() === (challenge.group_chat_url ?? '') || (groupUrl.trim() !== '' && !groupPreview)}
            className="nb"
            style={btn('#4D7CFF', {
              flex: 1,
              color: '#fff',
              fontSize: 14,
              opacity:
                busy || groupUrl.trim() === (challenge.group_chat_url ?? '') || (groupUrl.trim() !== '' && !groupPreview)
                  ? 0.5
                  : 1,
            })}
          >
            Save link
          </button>
          {challenge.group_chat_url && (
            <button
              onClick={() => {
                setGroupUrl('');
                patch({ group_chat_url: '' }, 'Group chat removed.');
              }}
              disabled={busy}
              className="nb"
              style={btn('#fff', { fontSize: 14, padding: '13px 14px' })}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* invite */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 12 }}>INVITE CODE</div>
          <div style={{ fontFamily: ARCHIVO, fontSize: 20, letterSpacing: 3 }}>{challenge.invite_code}</div>
        </div>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(inviteUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              // ignore
            }
          }}
          disabled={!sharing}
          className="nb"
          style={btn('#4D7CFF', { color: '#fff', padding: '10px 14px', fontSize: 13, opacity: sharing ? 1 : 0.5 })}
        >
          {copied ? '✅' : 'Copy link'}
        </button>
      </div>

      {/* edit details */}
      <div style={card}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 15, marginBottom: 12 }}>EDIT CHALLENGE</div>

        <label style={label}>NAME</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={{ ...input, marginBottom: 14 }} />

        <label style={label}>GOAL ({challenge.unit_label} {challenge.goal_mode === 'daily' ? 'per day' : 'total'})</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          type="number"
          inputMode="decimal"
          min={1}
          style={{ ...input, marginBottom: 14 }}
        />

        <label style={label}>END DATE</label>
        <input value={end} onChange={(e) => setEnd(e.target.value)} type="date" min={challenge.start_date} style={{ ...input, marginBottom: 6 }} />
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 14 }}>
          Started {prettyDate(challenge.start_date)}. Changing the goal or end date updates it for everyone.
        </div>

        <button
          onClick={() =>
            patch({ name: name.trim(), goal_amount: goalNum, end_date: end }, 'Saved.')
          }
          disabled={!detailsDirty || !detailsValid || busy}
          className="nb"
          style={btn('#FF5DA2', {
            width: '100%',
            color: '#fff',
            opacity: detailsDirty && detailsValid && !busy ? 1 : 0.5,
          })}
        >
          {busy ? 'SAVING…' : detailsDirty ? 'SAVE CHANGES' : 'NOTHING TO SAVE'}
        </button>
      </div>

      {/* member list */}
      <div style={card}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 15, marginBottom: 10 }}>MEMBERS ({members.length})</div>
        {members.map((m) => (
          <div key={m.participant_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: m.avatar_color, border: `2px solid ${INK}`, flexShrink: 0 }} />
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name}
              {m.user_id === user.id ? ' (you)' : ''}
              {challenge.created_by === m.user_id ? ' 👑' : ''}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>
              {m.joined_at ? prettyDate(m.joined_at.slice(0, 10)) : ''}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 8 }}>
          To remove someone, open the Squad tab and use the remove button under their name.
        </div>
      </div>

      {err && <div style={{ color: '#C21F3A', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ color: '#1E7F45', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {/* delete */}
      <div style={{ ...card, borderColor: '#C21F3A', boxShadow: '6px 6px 0 #C21F3A' }}>
        <div style={{ fontFamily: ARCHIVO, fontSize: 15, marginBottom: 6 }}>DELETE CHALLENGE</div>
        <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginTop: 0, marginBottom: 12 }}>
          Removes the challenge and every entry logged in it, for everyone. This cannot be undone.
        </p>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={remove} disabled={busy} className="nb" style={btn('#C21F3A', { flex: 1, color: '#fff', opacity: busy ? 0.6 : 1 })}>
              {busy ? '…' : 'Yes, delete it all'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="nb" style={btn('#fff', { flex: 1 })}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="nb" style={btn('#fff', { width: '100%', color: '#C21F3A' })}>
            🗑️ Delete challenge
          </button>
        )}
      </div>

    </main>
  );
}
