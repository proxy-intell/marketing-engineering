// Welcome email, sent once when someone first joins the Friday drop (site box or a vote with weekly_drop).
const REPO = "https://github.com/proxy-intell/marketing-engineering";
const CMD = "vote on marketing engineering - https://marketingengineering.dev/vote.md";
const POSTAL = "Proxy Intelligence Inc., 131 Continental Dr, Suite 305, Newark, DE 19713, US";

export const SUBJECT = "you're in. now go send your vote";
const PREVIEW = "your agent does the paperwork, you just say yes";
const BEFORE = [
  "hey, you're in.",
  "marketing engineering ranks marketing tools by what ai agents say people actually use, whether that's daily, weekly, monthly or just installed. not what twitter says.",
  "haven't voted yet? give your agent this line:",
];
const AFTER = [
  "it reads your setup, shows you the vote and waits for your yes. you just nod.",
  "stack changed? vote again, the new one replaces the old.",
  "one email every friday. only the tools added that week.",
  "star the repo or share it. more votes, harder to game.",
];
const SIGNOFF = ["questions? just reply.", "tanmay"];
const FOOT = `you're getting this because you joined the friday drop on marketingengineering.dev. reply "stop" and you're off the list. ${POSTAL}`;

export function renderWelcome() {
  const ink = "#181818", paper = "#F3EFE3", orange = "#FF5A1F", mute = "#6b675c";
  const body = "font-family:Inter,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:" + ink;
  const mono = "font-family:'JetBrains Mono',Menlo,Consolas,monospace";
  const p = (t) => `<p style="margin:0 0 16px;${body}">${t}</p>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:${paper}">
<div style="display:none;max-height:0;overflow:hidden">${PREVIEW}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 14px;border-bottom:2px solid ${ink};${mono};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${ink}">marketing engineering</td></tr>
<tr><td style="padding:28px 0 0">
${BEFORE.map(p).join("\n")}
<div style="background:${ink};color:${paper};padding:14px 16px;margin:0 0 16px;${mono};font-size:14px;line-height:1.5;word-break:break-word">$ ${CMD}</div>
${AFTER.slice(0, 3).map(p).join("\n")}
${p(AFTER[3])}
<p style="margin:0 0 24px"><a href="${REPO}" style="display:inline-block;background:${orange};color:${ink};text-decoration:none;font-family:'Archivo Narrow','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:15px;padding:12px 18px">&#9734; star the repo</a></p>
${SIGNOFF.map(p).join("\n")}
</td></tr>
<tr><td style="padding:20px 0 0;border-top:2px solid ${ink};${mono};font-size:11px;line-height:1.5;color:${mute}">${FOOT}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [...BEFORE, "", CMD, "", ...AFTER, `star it: ${REPO}`, "", ...SIGNOFF, "", "--", FOOT].join("\n\n").replace(/\n{3,}/g, "\n\n");
  return { subject: SUBJECT, html, text };
}
