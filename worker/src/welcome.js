// Welcome email, sent once when someone first joins the Friday drop (site box or a vote with weekly_drop).
const SITE = "https://marketingengineering.dev";
const POSTAL = "Proxy Intelligence Inc., 131 Continental Dr, Suite 305, Newark, DE 19713, US";

export const SUBJECT = "you're in on marketing engineering";
const RANKS = "marketing engineering ranks tools by what people's agents say they actually use, whether that's daily, weekly, monthly or just installed. not what x/twitter says.";
const FRIDAY = "every friday you get the tools added that week. nothing else.";
const SIGNOFF = ["questions? just reply.", "tanmay"];
const FOOT = `you're getting this because you joined the friday drop on marketingengineering.dev. reply "stop" and you're off the list. ${POSTAL}`;

// voted: they joined while voting (most people). Otherwise they used the site box and haven't voted yet.
const COPY = {
  voted: {
    preview: "new tools every friday, and your vote's already counting",
    lines: [
      "hey, you're in. your vote's already in the ranking.",
      RANKS,
      "so you get to see what's actually good, from people who work like you. not whoever posted the loudest thread.",
      "stack changed? vote again and the new one replaces the old.",
      FRIDAY,
    ],
  },
  site: {
    preview: "new tools every friday. your vote is the bit that makes it work",
    lines: [
      "hey, you're in.",
      RANKS,
      "your vote is what makes it work. the more of us vote, the clearer it gets what's actually good for people who work like you.",
    ],
    button: ["send your vote", SITE],
    after: [FRIDAY],
  },
};

export function renderWelcome({ voted = true } = {}) {
  const c = voted ? COPY.voted : COPY.site;
  const ink = "#181818", paper = "#F3EFE3", orange = "#FF5A1F", mute = "#6b675c";
  const font = "font-family:Inter,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:" + ink;
  const mono = "font-family:'JetBrains Mono',Menlo,Consolas,monospace";
  const p = (t) => `<p style="margin:0 0 16px;${font}">${t}</p>`;
  const button = c.button
    ? `<p style="margin:4px 0 24px"><a href="${c.button[1]}" style="display:inline-block;background:${orange};color:${ink};text-decoration:none;font-family:'Archivo Narrow','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:15px;padding:12px 18px">${c.button[0]} &rarr;</a></p>`
    : "";
  const body = [...c.lines.map(p), button, ...(c.after || []).map(p), ...SIGNOFF.map(p)].join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:${paper}">
<div style="display:none;max-height:0;overflow:hidden">${c.preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 14px;border-bottom:2px solid ${ink};${mono};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${ink}">marketing engineering</td></tr>
<tr><td style="padding:28px 0 0">
${body}
</td></tr>
<tr><td style="padding:20px 0 0;border-top:2px solid ${ink};${mono};font-size:11px;line-height:1.5;color:${mute}">${FOOT}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [...c.lines, ...(c.button ? [`${c.button[0]}: ${c.button[1]}`] : []), ...(c.after || []), ...SIGNOFF, "--", FOOT].join("\n\n");
  return { subject: SUBJECT, preview: c.preview, html, text };
}
