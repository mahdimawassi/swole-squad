// Email delivery via Resend's REST API (no SDK needed).
// If the env vars are missing the app still works end to end, it just skips
// sending and the link is shown on screen instead. That way you can deploy
// before you own a domain.

const INK = '#141414';

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function shell(inner: string): string {
  return `<div style="background:#FFE066;padding:28px 16px;font-family:Helvetica,Arial,sans-serif;color:${INK}">
  <div style="max-width:460px;margin:0 auto;background:#fff;border:3px solid ${INK};border-radius:20px;padding:24px">
    <div style="font-size:22px;font-weight:900;letter-spacing:.5px;margin-bottom:14px">🏋️ SWOLE SQUAD</div>
    ${inner}
  </div>
  <div style="max-width:460px;margin:14px auto 0;text-align:center;font-size:12px;opacity:.7">
    Anyone with this link can log as you, so keep it to yourself.
  </div>
</div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#FF5DA2;color:#fff;text-decoration:none;border:3px solid ${INK};border-radius:14px;padding:13px 20px;font-weight:900;font-size:16px">${label}</a>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendAccessLink(opts: {
  to: string;
  name: string;
  link: string;
  challengeName?: string;
  inviteUrl?: string;
}): Promise<boolean> {
  const { to, name, link, challengeName, inviteUrl } = opts;
  const intro = challengeName
    ? `You&rsquo;re in <b>${escapeHtml(challengeName)}</b>. This link is how you get back in, on any device. Bookmark it.`
    : `This link is how you get back into your challenges, on any device. Bookmark it.`;
  const invite = inviteUrl
    ? `<p style="font-size:13px;font-weight:600;margin:18px 0 0">Want to drag someone else in? Send them this:<br>
       <a href="${inviteUrl}" style="color:#4D7CFF">${inviteUrl}</a></p>`
    : '';
  const html = shell(`
    <p style="font-size:16px;font-weight:600;margin:0 0 8px">Hey ${escapeHtml(name)},</p>
    <p style="font-size:15px;font-weight:500;margin:0 0 20px">${intro}</p>
    ${button(link, 'OPEN MY CHALLENGES →')}
    <p style="font-size:12px;opacity:.7;margin:18px 0 0;word-break:break-all">${link}</p>
    ${invite}
  `);
  return send(to, challengeName ? `You're in: ${challengeName} 💪` : 'Your Swole Squad link 💪', html);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
}
