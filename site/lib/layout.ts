// Shared page shell for / and /v: head, fonts, the site CSS, the PostHog snippet and the nav.
import { env } from "./env";

// Favicon, fonts and the whole site stylesheet. Verbatim from the worker's homepage.
const STYLE = String.raw`<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2215%22%20fill%3D%22%23BFDAF5%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2220%22%20height%3D%2220%22%20rx%3D%225.5%22%20fill%3D%22%23FFC53D%22%2F%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%2220%22%20r%3D%2210%22%20fill%3D%22%23F5B5E1%22%2F%3E%3Cpolygon%20points%3D%2231.0%2C44.0%2025.5%2C53.5%2014.5%2C53.5%209.0%2C44.0%2014.5%2C34.5%2025.5%2C34.5%22%20fill%3D%22%231FA35B%22%2F%3E%3Crect%20x%3D%2236.8%22%20y%3D%2236.8%22%20width%3D%2214.4%22%20height%3D%2214.4%22%20rx%3D%222.4%22%20fill%3D%22%23FF5A1F%22%20transform%3D%22rotate%2845%2044%2044%29%22%2F%3E%3C%2Fsvg%3E"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"><style>
:root {
  --yellow: #FFC53D;
  --paper: #F3EFE3; --ink: #181818; --orange: #FF5A1F; --cobalt: #2448FF; --mute: #6b675c; --rule: #181818; --soft: color-mix(in srgb, var(--paper) 93%, #181818);
  --display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  color-scheme: light;
}
* { box-sizing: border-box }
html { background: var(--paper) }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.55 var(--body); padding-block: 0 0;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)) }
a { color: var(--cobalt); text-underline-offset: 3px }
:focus-visible { outline: 3px solid var(--cobalt); outline-offset: 3px }
button { font: inherit; cursor: pointer; color: inherit }
.wrap { max-width: 1240px; margin: 0 auto }
.bleed { margin-inline: calc(50% - 50vw); padding-inline: max(16px, calc(50vw - 620px)) }

.icslot { display: inline-flex; width: 20px; height: 20px }
.brand { display: inline-flex; align-items: center; gap: 9px }
.opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0; border-top: 2px solid var(--ink) }
.opt { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 12px 16px; border: 0; border-right: 2px solid var(--ink); border-bottom: 2px solid var(--ink); background: transparent; color: var(--ink); cursor: pointer; font: 700 .7rem var(--mono); text-transform: uppercase; letter-spacing: .05em; text-align: center }
.opt .sm { display: flex; gap: 10px; align-items: flex-end }
.opt:hover { background: var(--soft) }
.opt[aria-checked="true"] { background: var(--soft); box-shadow: inset 0 0 0 4px var(--cobalt) }
.opt[aria-checked="true"]::after { content: "picked"; background: var(--cobalt); color: #fff; padding: 2px 8px; font-size: .62rem }
.opt .no { color: var(--cobalt) }
.badgebox { padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; border-bottom: 2px solid var(--ink) }
.card[data-item="icon-b"] .fb .v { display: none }
button:focus-visible, a:focus-visible, input:focus-visible, [tabindex]:focus-visible { outline: 3px solid var(--cobalt); outline-offset: 2px }
.rev { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); border-top: 2px solid var(--ink) }
.rev > div { padding: 16px 16px 8px; border-right: 2px solid var(--ink); border-bottom: 2px solid var(--ink) }
.rev h3 { margin: 0 0 8px; font: 700 .72rem var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--cobalt) }
.rev ul { margin: 0 0 10px; padding-left: 18px } .rev li { margin: 0 0 8px; font-size: .88rem; line-height: 1.45 } .rev li b { font-weight: 700 }
.mono { font: 500 .75rem/1.4 var(--mono); letter-spacing: .06em; text-transform: uppercase }
.one { border-top: 2px solid var(--ink); padding: 16px; display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end }
.one img { display: block; width: 100%; height: auto; border: 2px solid var(--ink) }
.isz { display: inline-flex; flex-direction: column; align-items: center; gap: 6px } .isz em { font: 500 .7rem var(--mono); font-style: normal; color: var(--mute) }
.dls { border-top: 2px solid var(--ink); padding: 12px 16px 14px; display: flex; flex-wrap: wrap; gap: 8px }
.dl { background: transparent; cursor: pointer; border: 2px solid var(--ink); padding: 6px 10px; font: 700 .7rem var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--ink); text-decoration: none }
.dl:hover { background: var(--ink); color: var(--paper) }
.view[hidden] { display: none }

/* site */
.nav { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: center; padding: 14px 0; border-bottom: 2px solid var(--rule) }
.nav .links { display: flex; gap: 20px; margin-left: auto; flex-wrap: wrap; align-items: center }
.nav a { color: var(--ink); text-decoration: none }
.nav a:hover { color: var(--cobalt) }
.nav .live { color: var(--cobalt); font-weight: 700 }
.h-right { grid-column: 8 / span 5; min-width: 0 }
/* hero: the ask on the left, how to vote on the right */
.hero { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: clamp(24px, 4vw, 56px); align-items: center; padding-block: clamp(28px, 5vw, 64px) }
.h-left { min-width: 0 }
.hero h1 { font-size: clamp(2.6rem, 6.4vw, 5.6rem); line-height: .92; font-variation-settings: "wdth" 80; text-wrap: balance }
.lede { margin: 22px 0 0; font-size: clamp(1.02rem, 1.4vw, 1.2rem); line-height: 1.5 }
.lede b { font-weight: 800 }
.votecard { min-width: 0; background: var(--ink); color: var(--paper); padding: 18px; box-shadow: 8px 8px 0 var(--orange) }
.vc-h { font: 800 1.35rem var(--display); font-variation-settings: "wdth" 85; margin-bottom: 10px }
.works { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #d9d4c5 }
.works .ag { display: inline-flex } .works .ag svg { width: 18px; height: 18px }
.works .more { font: 500 .72rem var(--mono); color: #bdb8a8 }
.steps { margin: 0; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 10px }
.steps[start="2"] { counter-reset: s 1; margin-top: 12px }
.steps li { counter-increment: s; display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; font-size: .92rem; line-height: 1.45; color: #e7e2d4 }
.steps li::before { content: counter(s); width: 26px; height: 26px; display: grid; place-items: center; background: var(--paper); color: var(--ink); font: 800 .8rem var(--mono) }
.steps b { color: var(--paper) }
.vc-bar { display: flex; gap: 12px; align-items: center; background: #2a2a2a; padding: 10px 10px 10px 14px; margin-top: 8px }
.vc-bar code { flex: 1; min-width: 0; font: 500 .82rem/1.5 var(--mono); color: var(--paper); overflow-wrap: anywhere }
.vc-bar button { border: 0; background: var(--orange); color: var(--ink); font: 700 .78rem var(--mono); text-transform: uppercase; letter-spacing: .05em; padding: 0 16px; min-height: 40px; white-space: nowrap }
.howlink { display: block; margin-top: 16px; padding-top: 12px; border-top: 1px solid #3a3a3a; text-align: right; font: 500 .72rem var(--mono); color: #bdb8a8; text-transform: uppercase; letter-spacing: .04em }
.howlink:hover { color: var(--paper) }
/* shape band (Config-style supergraphic): colour cells with a nested primitive, cropped at the screen edges */
.band { margin-inline: calc(50% - 50vw); overflow: hidden; border-block: 2px solid var(--ink); background: var(--ink) }
.band-in { display: flex; gap: 2px; width: max-content; margin-left: -40px }
.cell { --s: clamp(56px, 7.4vw, 108px); width: var(--s); height: var(--s); flex: none; position: relative; overflow: hidden; background: var(--bg) }
.cell i { position: absolute; background: var(--fg); transition: transform .6s cubic-bezier(.6, 0, .2, 1), border-radius .6s cubic-bezier(.6, 0, .2, 1) }
.cell i + i { background: var(--bg) }
.s-circle i { inset: 14%; border-radius: 50% }
.s-ring i { inset: 10%; border-radius: 50% } .s-ring i + i { inset: 32% }
.s-diamond i { inset: 20%; transform: rotate(45deg) }
.s-pill i { inset: 30% 8%; border-radius: 999px } .s-pillv i { inset: 8% 30%; border-radius: 999px }
.s-quarter i { inset: 0; border-radius: 0 0 0 100% }
.s-half i { inset: 50% 0 0 0; border-radius: 999px 999px 0 0 }
.s-square i { inset: 18% } .s-square i + i { inset: 38% }
.s-star i { inset: 40% 10%; border-radius: 999px } .s-star i + i { inset: 10% 40%; background: var(--fg); border-radius: 999px }
.cell:hover i, .cell.on i { transform: rotate(90deg) scale(.86) }
.s-circle:hover i, .s-circle.on i { border-radius: 22% }
.s-diamond:hover i, .s-diamond.on i { transform: rotate(0deg) scale(.86) }
.band + .wrap.sec { border-top: 0 }
h1 { font: 850 clamp(3.6rem, 9.2vw, 8.6rem)/.9 var(--display); font-variation-settings: "wdth" 76; letter-spacing: -.012em; font-kerning: normal; margin: 0 }

/* outline: orange is kept for the vote */
.signup { border: 2px solid var(--ink); background: transparent; color: var(--ink); padding: 4px 12px; font: 700 .75rem var(--mono); text-transform: uppercase; letter-spacing: .05em }
.signup:hover { background: var(--ink); color: var(--paper) }
.sud { width: min(440px, calc(100vw - 32px)); border: 2px solid var(--ink); background: var(--paper); color: var(--ink); padding: 28px 24px 22px; box-shadow: 8px 8px 0 var(--ink) }
.sud::backdrop { background: color-mix(in srgb, var(--ink) 55%, transparent) }
.sud h2 { margin: 0 0 6px; font: 800 1.6rem/1.1 var(--display); font-variation-settings: "wdth" 85 }
.sud p { margin: 0 }
.sud .field { margin: 18px 0 8px }
.sud-x { position: absolute; top: 8px; right: 10px; margin: 0 }
.sud-x button { border: 0; background: transparent; font-size: 1.5rem; line-height: 1; padding: 4px 6px }
.ctas { display: flex; flex-wrap: wrap; gap: 14px 22px; align-items: center }
.btn { background: var(--orange); color: var(--ink); border: 2px solid var(--ink); padding: 13px 22px; font: 800 1rem var(--display); font-variation-settings: "wdth" 85; letter-spacing: .01em; box-shadow: 5px 5px 0 var(--ink); transition: transform .12s, box-shadow .12s }
.btn:hover { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 var(--ink) }
.btn:active { transform: translate(3px, 3px); box-shadow: 2px 2px 0 var(--ink) }
.ghost { font: 700 .8rem var(--mono); text-transform: uppercase; letter-spacing: .06em }

/* demo */
.demo-wrap { position: relative; padding-right: 0 }
.demo { border: 14px solid var(--orange); outline: 2px solid var(--ink); background: var(--paper); position: relative }
.term { padding: 16px 18px 18px; font: 500 .8rem/1.75 var(--mono); min-height: 372px; background: var(--paper); border: 2px solid var(--ink); margin: -2px }
.term .bar { display: flex; gap: 6px; margin-bottom: 10px; align-items: center; color: var(--mute); font-size: .7rem; letter-spacing: .06em; text-transform: uppercase }
.term .bar i { width: 9px; height: 9px; background: var(--ink); border-radius: 50% }
.term .l { opacity: 0; transform: translateY(4px); transition: opacity .2s, transform .2s; position: relative }
.term .l.on { opacity: 1; transform: none }
.term .dim { color: var(--mute) } .term .ok { color: var(--cobalt); font-weight: 700 }
.term .tbl { display: grid; grid-template-columns: auto auto; justify-content: start; column-gap: 28px }
.term .actions { display: flex; gap: 10px; margin-top: 6px }
.term .actions button { border: 2px solid var(--ink); background: var(--paper); padding: 4px 12px; font: 700 .75rem var(--mono); text-transform: uppercase }
.term .actions button.go { background: var(--cobalt); color: #fff; border-color: var(--cobalt) }
.term .actions button:disabled { opacity: .35; cursor: default }
.pin { display: none; position: relative; margin: 3px 0 8px 22px; width: max-content; max-width: calc(100% - 22px); background: var(--cobalt); color: #fff; font: 700 .66rem/1.3 var(--mono); letter-spacing: .04em; padding: 3px 8px; white-space: normal; text-transform: uppercase }
.pin::before { content: ""; position: absolute; right: 100%; top: 50%; width: 22px; height: 2px; background: var(--cobalt) }
.pin::after { content: ""; position: absolute; right: calc(100% + 18px); top: calc(50% - 3px); border: 4px solid transparent; border-right-color: var(--cobalt); border-left: 0 }
.term .l.on .pin { display: block; animation: pop .25s ease-out }
@keyframes pop { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: none } }

/* ranking */
.sec { padding: clamp(36px, 6vw, 72px) 0; border-top: 2px solid var(--rule) }
.sec-h { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; margin-bottom: 26px; align-items: end }
.sec-h .n { grid-column: 1 / span 2 }
.sec-h h2 { grid-column: 1 / -1; margin: 0; font: 850 clamp(2.2rem, 5.2vw, 4.4rem)/.9 var(--display); font-variation-settings: "wdth" 76; letter-spacing: -.012em }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px }
.chip { border: 2px solid var(--ink); background: var(--paper); padding: 4px 10px; font: 700 .7rem var(--mono); text-transform: uppercase; letter-spacing: .04em }
.chip[aria-pressed="true"] { background: var(--cobalt); border-color: var(--cobalt); color: #fff }
.board { border-top: 2px solid var(--rule) }
.catrow { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; padding: 18px 0 6px; border-bottom: 1px solid var(--rule) }
.catrow { display: flex; align-items: center; gap: 12px }
.gl { width: 30px; height: 30px; position: relative; flex: none; background: var(--c) }
.gl::before, .gl::after { content: ""; position: absolute }
.gl.m0 { border-radius: 8px } .gl.m0::before { inset: 6px; border-radius: 50%; background: var(--ink) } .gl.m0::after { inset: 12px; border-radius: 50%; background: var(--c) }
.gl.m1 { border-radius: 50% } .gl.m1::before { inset: 7px; background: var(--paper); transform: rotate(45deg) scale(.82) } .gl.m1::after { inset: 12px; background: var(--cobalt) }
.gl.m2 { clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%) } .gl.m2::before { left: 5px; right: 5px; top: 11px; bottom: 11px; border-radius: 99px; background: var(--ink) }
.sw { display: inline-block; width: 10px; height: 10px; margin-right: 7px; background: var(--c); border: 1px solid var(--ink); vertical-align: -1px }
.catrow { padding-top: 26px; margin-top: 56px }
.board > .catrow:first-child { margin-top: 0 }
.catrow h3 { margin: 0; font: 700 .8rem var(--mono); text-transform: uppercase; letter-spacing: .06em }
.tr { display: grid; grid-template-columns: 40px minmax(0, 5fr) minmax(0, 4fr) 70px 60px; gap: 18px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--rule); transition: background .15s }
.tr:hover { background: var(--soft) }
.tr .rk { font: 700 .8rem var(--mono); color: var(--mute) }
.tr .nm a { color: var(--ink); font: 800 1.15rem/1.2 var(--display); font-variation-settings: "wdth" 88; text-decoration: none; letter-spacing: -.01em }
.tr .nm a:hover { color: var(--cobalt); text-decoration: underline }
.tr .nm p { margin: 2px 0 0; color: var(--mute); font-size: .85rem; line-height: 1.4 }
.meter { height: 14px; border: 2px solid var(--ink); position: relative; background: var(--paper) }
.meter i { position: absolute; inset: 0 auto 0 0; background: var(--c, var(--ink)); transition: width .5s cubic-bezier(.2, .8, .2, 1) }
.meter i.top { background: var(--orange) }
.meter b { position: absolute; top: 0; bottom: 0; background: repeating-linear-gradient(45deg, var(--cobalt) 0 4px, transparent 4px 8px); opacity: .85; transition: width .6s cubic-bezier(.2, .8, .2, 1); border-right: 2px solid var(--cobalt) }
.tr .sc, .tr .vt { font: 700 .85rem var(--mono); text-align: right }
.tr .vt { color: var(--mute) }
.th { display: grid; grid-template-columns: 40px minmax(0, 5fr) minmax(0, 4fr) 70px 60px; gap: 18px; padding: 8px 0; font: 700 .68rem var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--mute); border-bottom: 2px solid var(--rule) }
.th span:nth-child(n+4) { text-align: right }
.note-demo { font: 500 .72rem var(--mono); color: var(--cobalt); min-height: 1.4em; margin-bottom: 8px }

/* orange block */
.block { background: var(--paper); border-block: 2px solid var(--ink); padding-block: clamp(40px, 7vw, 88px) }
.block h2 { margin: 0 0 30px; font: 850 clamp(2.2rem, 5.2vw, 4.4rem)/.9 var(--display); font-variation-settings: "wdth" 76; letter-spacing: -.012em }
.nums { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 2px solid var(--ink) }
.nums div { padding: 20px 20px 22px; border-right: 2px solid var(--ink); min-width: 0; display: flex; flex-direction: column; gap: 6px }
.nums div:last-child { border-right: 0 }
.nums .mt { margin-bottom: 14px; border-radius: 12px }
.nums em { display: block; font: 500 .78rem var(--mono) }
.nums strong { display: block; font: 850 clamp(3.4rem, 9vw, 7.4rem)/.85 var(--display); font-variation-settings: "wdth" 76; letter-spacing: -.012em }
.nums span { font: 700 .75rem var(--mono); text-transform: uppercase; letter-spacing: .06em }
.block p { max-width: 58ch; margin: 22px 0 0; font-weight: 500 }

/* makers + drop */
.two { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px }
.two > div { grid-column: span 6; min-width: 0 }
.two h3 { margin: 0 0 10px; font: 850 clamp(1.7rem, 3.2vw, 2.6rem)/.95 var(--display); font-variation-settings: "wdth" 78; letter-spacing: -.03em }
.code { display: flex; align-items: stretch; border: 2px solid var(--ink); margin: 14px 0; min-width: 0 }
.code code { flex: 1; font: 500 .76rem/1.5 var(--mono); padding: 10px 12px; overflow-x: auto; white-space: nowrap; background: var(--soft) }
.code button { border: 0; border-left: 2px solid var(--ink); background: var(--cobalt); color: #fff; padding: 0 14px; font: 700 .72rem var(--mono); text-transform: uppercase }
.field { display: flex; gap: 0; border: 2px solid var(--ink); margin: 14px 0 6px }
.field input { flex: 1; min-width: 0; border: 0; padding: 12px 14px; font: 500 .95rem var(--body); background: var(--paper); color: var(--ink) }
.field button { border: 0; border-left: 2px solid var(--ink); background: var(--orange); font: 800 .95rem var(--display); font-variation-settings: "wdth" 85; padding: 0 20px }
.fine { font: 500 .72rem var(--mono); color: var(--mute); text-transform: uppercase; letter-spacing: .04em }
.tools { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap }
.dd { position: relative }
.dd button { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-width: 280px; border: 2px solid var(--ink); background: var(--paper); color: var(--ink); font: 700 .74rem var(--mono); text-transform: uppercase; letter-spacing: .05em; padding: 11px 12px; border-radius: 0; cursor: pointer }
.dd button i { width: 8px; height: 8px; border-right: 2px solid var(--ink); border-bottom: 2px solid var(--ink); transform: rotate(45deg) translate(-2px, -2px); transition: transform .15s }
.dd button[aria-expanded="true"] { background: var(--ink); color: var(--paper) }
.dd button[aria-expanded="true"] i { border-color: var(--paper); transform: rotate(225deg) translate(-2px, -2px) }
.dd ul { position: absolute; z-index: 20; top: calc(100% - 2px); left: 0; min-width: 100%; max-height: 340px; overflow-y: auto; margin: 0; padding: 0; list-style: none; background: var(--paper); border: 2px solid var(--ink) }
.dd li { display: flex; align-items: center; gap: 10px; padding: 11px 12px; font: 700 .72rem var(--mono); text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid var(--rule); cursor: pointer; white-space: nowrap }
.dd li:last-child { border-bottom: 0 }
.dd li::before { content: ""; width: 8px; height: 8px; border: 2px solid var(--ink); flex: none }
.dd li[aria-selected="true"]::before { background: var(--cobalt); border-color: var(--cobalt) }
.dd li[aria-selected="true"] { color: var(--cobalt) }
.dd li:hover, .dd li.hl { background: var(--ink); color: var(--paper) }
.dd li:hover::before, .dd li.hl::before { border-color: var(--paper) }
.tools input { border: 2px solid var(--ink); background: var(--paper); color: var(--ink); font: 500 .85rem var(--mono); padding: 9px 12px; border-radius: 0 }
.tools input { flex: 1; min-width: 160px; max-width: 360px }
.tools .count { color: var(--mute); margin-left: auto }
.tw { overflow-x: auto }
table.rt { border-collapse: separate; border-spacing: 0; width: 100%; font-size: .9rem }
table.rt thead th { position: sticky; top: 0; z-index: 2; background: var(--paper); border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); font: 700 .68rem var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--mute); text-align: left; padding: 11px 12px; white-space: nowrap }
table.rt th button { all: unset; cursor: pointer; font: inherit; text-transform: inherit; letter-spacing: inherit; color: inherit }
table.rt th button:hover, table.rt th[aria-sort="ascending"] button, table.rt th[aria-sort="descending"] button { color: var(--ink) }
table.rt th[aria-sort="ascending"] button::after { content: " ↑" } table.rt th[aria-sort="descending"] button::after { content: " ↓" }
table.rt td { border-bottom: 1px solid var(--rule); padding: 10px 12px; height: 52px; vertical-align: middle }
table.rt tbody tr:hover td { background: rgba(24,24,24,.04) }
table.rt .n, table.rt td.rk { width: 44px; color: var(--mute); font: 700 .78rem var(--mono) }
table.rt .num { text-align: right } table.rt td.num { font: 700 .85rem var(--mono); font-variant-numeric: tabular-nums }
table.rt td.nm a { color: var(--ink); font: 800 1.02rem/1.2 var(--display); font-variation-settings: "wdth" 88; text-decoration: none; white-space: nowrap }
table.rt td.nm a:hover { color: var(--cobalt); text-decoration: underline }
table.rt td.cat { font: 500 .72rem var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--mute); white-space: nowrap }
table.rt td.desc { color: var(--mute); font-size: .82rem; line-height: 1.35; min-width: 260px; max-width: 420px }
table.rt td.bar { width: 160px } table.rt .c-bar { width: 160px }
table.rt .meter { height: 12px }
.empty-row td { text-align: center; color: var(--mute); font: 500 .85rem var(--mono); padding: 28px }
table.rt td.set a { color: inherit }
@media (max-width: 900px) { .c-desc, td.desc, .c-bar, td.bar, .c-set, td.set { display: none } }
@media (max-width: 600px) { .c-cat, td.cat { display: none } }
footer.site { background: var(--ink); color: var(--paper); margin-inline: calc(50% - 50vw); padding: 26px max(16px, calc(50vw - 620px)); display: flex; flex-wrap: wrap; gap: 8px 28px }
footer.site a { color: var(--paper) }
.ghl { display: inline-flex; align-items: center; gap: 7px }

/* feedback */
.fb { display: grid; gap: 10px; padding: 14px 16px 16px; border-top: 2px solid var(--ink); background: var(--paper) }
.fb .v { display: flex; flex-wrap: wrap; gap: 8px }
.fb .v button { border: 2px solid var(--ink); background: var(--paper); padding: 7px 14px; font: 700 .75rem var(--mono); text-transform: uppercase; letter-spacing: .04em }
.fb .v button[aria-pressed="true"] { background: var(--cobalt); border-color: var(--cobalt); color: #fff }
.fb input { width: 100%; border: 2px solid var(--ink); background: var(--soft); padding: 9px 12px; font: 400 .95rem var(--body); color: var(--ink) }
.fb .st { font: 500 .7rem var(--mono); color: var(--mute); min-height: 1em }
.cmp { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 0; border-top: 2px solid var(--ink) }
.cmp figure { margin: 0; padding: 14px; border-right: 2px solid var(--ink); min-width: 0 }
.cmp figure:last-child { border-right: 0 }
.cmp img { display: block; width: 100%; height: auto; border: 2px solid var(--ink) }
.cmp figcaption { margin-bottom: 8px }
.card { border: 2px solid var(--ink); margin-bottom: 26px; background: var(--paper) }
.card h2 { margin: 0; padding: 14px 16px 12px; font: 850 1.5rem/1 var(--display); font-variation-settings: "wdth" 80; letter-spacing: -.02em }
.card .sub { padding: 0 16px 12px; margin: 0; color: var(--mute); font-size: .9rem }
#dump { display: none; margin: 18px 0 }
#dump.on { display: grid; gap: 8px }
#dump textarea { width: 100%; min-height: 160px; font: 500 .8rem/1.5 var(--mono); padding: 12px; border: 2px solid var(--ink); background: var(--soft); color: var(--ink) }

@media (max-width: 1080px) {
  .h-right { grid-column: 1 / -1 }
}
@media (max-width: 860px) { .hero { grid-template-columns: minmax(0, 1fr) } }
@media (max-width: 760px) {
  .tr, .th { grid-template-columns: 28px minmax(0, 1fr) 54px 44px }
  .tr .meter-cell, .th span:nth-child(3) { display: none }
  .nums { grid-template-columns: repeat(2, minmax(0, 1fr)) }
  .nums div:nth-child(2) { border-right: 0 } .nums div:nth-child(-n+2) { border-bottom: 2px solid var(--ink) }
  .two > div { grid-column: 1 / -1 }
  .sec-h .n, .sec-h h2 { grid-column: 1 / -1 }
}
table.rt td.nm .msub { display: none }
@media (max-width: 600px) {
  /* one-line header on phones: logo and GitHub icon only, names kept for screen readers */
  .nav { flex-wrap: nowrap }
  .nav .nt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap }
  .nav .ghl svg { width: 22px; height: 22px }
  .nav .sl { display: none }
  .votecard { margin-right: 8px; padding: 16px }
  .vc-bar { flex-direction: column; align-items: stretch }
  .vc-bar code { font-size: .74rem }
  .vc-bar button { align-self: flex-end; min-height: 36px }
  .tools { display: grid; grid-template-columns: 1fr; gap: 8px }
  .tools input { max-width: none; min-width: 0 }
  .dd, .dd button { width: 100%; min-width: 0 }
  .tools .count { margin-left: 0 }
  .tools input, .field input { font-size: 16px }
  table.rt { table-layout: fixed }
  table.rt th, table.rt td { padding: 12px 6px; height: auto }
  table.rt th.num, table.rt td.num { width: 58px }
  table.rt th[data-k="name"], table.rt td.nm { width: auto; overflow: hidden }
  table.rt .n, table.rt td.rk { width: 30px }
  table.rt td.nm a { white-space: normal }
  table.rt td.nm .msub { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 3px; font: 500 .66rem/1.3 var(--mono); text-transform: uppercase; letter-spacing: .04em; color: var(--mute) }
  footer.site { flex-direction: column; gap: 10px }
  .sec-h { margin-bottom: 18px }
  .nums strong { font-size: 3.6rem }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important } }
.sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: 22px }
.scard { border: 2px solid var(--ink); background: var(--paper); padding: 16px; min-width: 0; display: flex; flex-direction: column; gap: 12px }
.scard h3 { margin: 0; font: 850 1.35rem/1.05 var(--display); font-variation-settings: "wdth" 80; letter-spacing: -.02em }
.scard ol { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: .88rem; line-height: 1.4 }
.scard ol a { color: var(--ink); font-weight: 700 }
.scard ol span.w { color: var(--mute) }
.scard .fine { margin: 0; margin-top: auto }
.scard .code { margin: 0 }
.scard .code code { white-space: normal; overflow-wrap: anywhere }
.smore { margin-top: 16px; border: 2px solid var(--ink); background: var(--paper); padding: 9px 16px; font: 700 .75rem var(--mono); text-transform: uppercase; letter-spacing: .05em }
@media (max-width: 560px) { .sgrid { grid-template-columns: minmax(0, 1fr) } }
.kd { margin-left: 8px; font: 700 .62rem var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--cobalt); vertical-align: middle }
</style>`;

// PostHog snippet. No key means no analytics: a no-op stub keeps the page's posthog.* calls safe.
const analytics = (key: string) =>
  key ? String.raw`<script>!function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify setPersonProperties reset get_distinct_id alias set_config opt_in_capturing opt_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init("${key}",{api_host:"https://eu.i.posthog.com",person_profiles:"identified_only"});</script>` : "<script>window.posthog={capture:function(){},identify:function(){}};</script>";

// Brand + GitHub link, the same header on every page.
export const NAV = String.raw`<div class="nav mono">
    <strong class="brand"><i class="icslot"><svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#BFDAF5"/><rect x="10" y="10" width="20" height="20" rx="5.5" fill="#FFC53D"/><circle cx="44" cy="20" r="10" fill="#F5B5E1"/><polygon points="31.0,44.0 25.5,53.5 14.5,53.5 9.0,44.0 14.5,34.5 25.5,34.5" fill="#1FA35B"/><rect x="36.8" y="36.8" width="14.4" height="14.4" rx="2.4" fill="#FF5A1F" transform="rotate(45 44 44)"/></svg></i><span class="nt">Marketing Engineering</span></strong>
    <div class="links"><a class="sl" href="/#setups">setups</a><a class="sl" href="/#rank">rankings</a><a class="ghl" href="https://github.com/proxy-intell/marketing-engineering" target="_blank" rel="noopener"><svg class="gh" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg><span class="nt">GitHub</span></a><button type="button" class="signup" id="suOpen">sign up</button></div>
  </div>
  <dialog class="sud" id="sud" aria-labelledby="sudH">
    <form method="dialog" class="sud-x"><button aria-label="Close">&times;</button></form>
    <h2 id="sudH">the friday drop</h2>
    <p>every friday, the tools added that week. nothing else.</p>
    <form class="field" id="suForm"><input type="email" id="suEm" placeholder="you@company.com" aria-label="Email" required><button type="submit" id="suJoin">join</button></form>
    <span class="fine" id="suNote">one email a week. reply "stop" to leave.</span>
  </dialog>
  <script>
  (function () {
    var d = document.getElementById("sud"), f = document.getElementById("suForm"), n = document.getElementById("suNote"), j = document.getElementById("suJoin");
    document.getElementById("suOpen").addEventListener("click", function () { d.showModal(); posthog.capture("signup_opened"); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); // backdrop click closes
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = document.getElementById("suEm").value.trim();
      j.disabled = true; n.textContent = "joining...";
      fetch("/v1/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: em }) })
        .then(function (r) { return r.json().then(function (x) { return { ok: r.ok, x: x }; }); })
        .then(function (r) { if (r.ok) { posthog.identify(em.toLowerCase(), { email: em.toLowerCase() }); f.hidden = true; } n.textContent = r.ok ? "you're in. first drop lands friday." : (r.x.error || "that didn't work, try again"); })
        .catch(function () { n.textContent = "that didn't work, try again"; })
        .then(function () { j.disabled = false; });
    });
  })();
  </script>`;

// meta: <title> and friends. extraHead: page-only <style>. body: everything from <body> on.
export function layout(meta: string, extraHead: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${meta}${STYLE}${analytics(env.POSTHOG_KEY)}${extraHead}</head>${body}`;
}
