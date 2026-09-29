"""Generate the Synthetic Practitioner brand SVGs into public/brand/.

Old Norse meets AI, in the Værksted family (see vaerksted.ai/brand): a gold-rimmed
seal on a deep scrubs-green cosmos, the name spelled in Elder Futhark around the rim,
and a healing Selbu rose in an aurora gradient at the centre. All text is outlined,
so the SVGs need no fonts installed.

    pip install fonttools uharfbuzz
    python3 scripts/build-brand.py

Fonts are fetched from the Google Fonts repository on GitHub. PNGs (icons, social
images) are rendered from the SVGs in a headless browser (see README).
"""
import io
import math
import os
import random
import sys
import urllib.request

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'brand')
os.makedirs(OUT, exist_ok=True)

# ─── Palette ──────────────────────────────────────────────────────────────
GREEN, INK, FROST = '#1e6b5c', '#10211d', '#EDEFF3'
VOID, DEEP = '#07080D', '#0c1d19'                       # cosmos, green-tinted
GOLD = '#E8C879'
GOLD_METAL = [(0, '#F7E7B0'), (38, '#E6C56F'), (52, '#B8893A'), (72, '#EBD083'), (100, '#F7E7B0')]
AURORA = [(0, '#4FD08A'), (50, '#38C5E0'), (100, '#5B8DEF')]  # the green-to-blue arc of Værksted's Bifröst

# Elder Futhark, letter by letter as Værksted does it (th → ᚦ, y → ᛁ).
RUNES_NAME = 'ᛊᛁᚾᚦᛖᛏᛁᚲ ᛈᚱᚨᚲᛏᛁᛏᛁᛟᚾᛖᚱ'
RUNE_RING = 'ᛊᛁᚾᚦᛖᛏᛁᚲ᛫ᛈᚱᚨᚲᛏᛁᛏᛁᛟᚾᛖᚱ᛫'

# ─── Fonts ────────────────────────────────────────────────────────────────
GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'


def fetch(path):
    return urllib.request.urlopen(GF + path).read()


class Face:
    """A font instance that can outline shaped text as SVG path data."""

    def __init__(self, blob, wght=None):
        self.blob, self.wght = blob, wght
        font = TTFont(io.BytesIO(blob))
        self.font = instantiateVariableFont(font, {'wght': wght}) if wght else font
        self.upm = self.font['head'].unitsPerEm
        self.glyphs = self.font.getGlyphSet()
        self.order = self.font.getGlyphOrder()
        self.cmap = self.font.getBestCmap()

    def run(self, text, x, y, size, tracking=0.0):
        """Outline `text` with its baseline at y. Returns (path data, width)."""
        hbf = hb.Font(hb.Face(self.blob))
        if self.wght:
            hbf.set_variations({'wght': self.wght})
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(hbf, buf, {'kern': True})
        s = size / self.upm
        pen = SVGPathPen(self.glyphs)
        adv = 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            t = (s, 0, 0, -s, x + (adv + pos.x_offset) * s, y - pos.y_offset * s)
            self.glyphs[self.order[info.codepoint]].draw(TransformPen(pen, t))
            adv += pos.x_advance + tracking * self.upm
        return pen.getCommands(), (adv - tracking * self.upm) * s

    def glyph(self, ch, x, y, size):
        s = size / self.upm
        pen = SVGPathPen(self.glyphs)
        self.glyphs[self.cmap[ord(ch)]].draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
        return pen.getCommands()

    def advance(self, ch, size):
        return self.font['hmtx'][self.cmap[ord(ch)]][0] * size / self.upm


SG = Face(fetch('spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf'), 600)
MONO = Face(fetch('jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf'), 500)
RUNIC = Face(fetch('notosansrunic/NotoSansRunic-Regular.ttf'))


def f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def stops(spec):
    return ''.join(f'<stop offset="{o}%" stop-color="{c}"/>' for o, c in spec)


# ─── The Selbu rose (healing flower; four long petals form a medical plus) ─
def lens(inner, tip, w):
    L = tip - inner
    r = (L * L / 4 + w * w) / (2 * w)
    return f'M32 {f(32 - inner)} A{f(r)} {f(r)} 0 0 1 32 {f(32 - tip)} A{f(r)} {f(r)} 0 0 1 32 {f(32 - inner)}Z'


BIG, SMALL = lens(6, 30, 7.4), lens(7, 21.5, 4.8)


def rose(cx, cy, radius, uid, small_opacity=0.72):
    """Aurora rose centred at (cx, cy) with petal tips at `radius`."""
    s = radius / 30
    fill = f'url(#{uid}aurora)'
    petals = lambda d, angles, attrs: ''.join(
        f'<path d="{d}" {attrs} transform="rotate({a} 32 32)"/>' for a in angles)
    return f'''<g transform="translate({f(cx - 32 * s)} {f(cy - 32 * s)}) scale({f(s)})">
    <linearGradient id="{uid}aurora" gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="56" y2="56">{stops(AURORA)}</linearGradient>
    <mask id="{uid}cut" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
      <rect width="64" height="64" fill="#fff"/>{petals(SMALL, (45, 135, 225, 315), 'fill="#000" stroke="#000" stroke-width="3.6"')}
    </mask>
    <g mask="url(#{uid}cut)">{petals(BIG, (0, 90, 180, 270), f'fill="{fill}"')}</g>
    <g opacity="{small_opacity}">{petals(SMALL, (45, 135, 225, 315), f'fill="{fill}"')}</g>
    <circle cx="32" cy="32" r="3.2" fill="{fill}"/>
  </g>'''


# ─── The seal ─────────────────────────────────────────────────────────────
def seal(cx, cy, R, uid, runes=True):
    """Gold rim, rune ring spelling the name, aurora rose on a green cosmos.
    runes=False gives the simplified seal for favicons and small sizes."""
    k = R / 440
    g = [f'''<defs>
    <linearGradient id="{uid}gold" gradientUnits="userSpaceOnUse" x1="0" y1="{f(cy - R)}" x2="0" y2="{f(cy + R)}">{stops(GOLD_METAL)}</linearGradient>
    <radialGradient id="{uid}disc" gradientUnits="userSpaceOnUse" cx="{f(cx)}" cy="{f(cy - R * 0.55)}" r="{f(R * 1.5)}">
      <stop offset="0%" stop-color="#17463b"/><stop offset="55%" stop-color="{DEEP}"/><stop offset="100%" stop-color="{VOID}"/>
    </radialGradient>
    <radialGradient id="{uid}halo" gradientUnits="userSpaceOnUse" cx="{f(cx)}" cy="{f(cy)}" r="{f(R * 0.62)}">
      <stop offset="0%" stop-color="#4FD08A" stop-opacity="0.22"/><stop offset="60%" stop-color="#38C5E0" stop-opacity="0.07"/><stop offset="100%" stop-color="#38C5E0" stop-opacity="0"/>
    </radialGradient>
  </defs>''',
         f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R + 6 * k)}" fill="url(#{uid}disc)"/>',
         f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R * 0.62)}" fill="url(#{uid}halo)"/>']
    if runes:
        g.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R)}" fill="none" stroke="url(#{uid}gold)" stroke-width="{f(12 * k)}"/>')
        g.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R - 26 * k)}" fill="none" stroke="{GOLD}" stroke-width="{f(7 * k)}" '
                 f'stroke-dasharray="{f(2 * k)} {f(17 * k)}" stroke-linecap="round" opacity="0.45"/>')
        g.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R - 116 * k)}" fill="none" stroke="url(#{uid}gold)" stroke-width="{f(3 * k)}" opacity="0.8"/>')
        size, base_r = 48 * k, R - 104 * k
        glyphs = []
        for i, ch in enumerate(RUNE_RING):
            ang = 360 * i / len(RUNE_RING)
            w = RUNIC.advance(ch, size)
            glyphs.append(f'<path transform="rotate({f(ang)} {f(cx)} {f(cy)})" d="{RUNIC.glyph(ch, cx - w / 2, cy - base_r, size)}"/>')
        g.append(f'<g fill="{GOLD}" opacity="0.85">{"".join(glyphs)}</g>')
        g.append(rose(cx, cy, R * 0.5, uid))
    else:
        g.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(R)}" fill="none" stroke="url(#{uid}gold)" stroke-width="{f(40 * k)}"/>')
        g.append(rose(cx, cy, R * 0.72, uid, small_opacity=0.8))
    return '\n  '.join(g)


# ─── Wordmark ─────────────────────────────────────────────────────────────
def wordmark(x, baseline, size, uid, fill, rune_fill):
    """'Synthetic Practitioner' in Space Grotesk SemiBold, with the name in runes beneath."""
    d, w = SG.run('Synthetic Practitioner', x, baseline, size, tracking=-0.03)
    rd, _ = RUNIC.run(RUNES_NAME, x + size * 0.04, baseline + size * 0.62, size * 0.36, tracking=0.35)
    cap = size * 0.7
    defs = f'''<defs><linearGradient id="{uid}wgold" gradientUnits="userSpaceOnUse" x1="0" y1="{f(baseline - cap * 1.05)}" x2="0" y2="{f(baseline + size * 0.05)}">{stops(GOLD_METAL)}</linearGradient></defs>'''
    fill = f'url(#{uid}wgold)' if fill == 'gold' else fill
    return defs + f'<path fill="{fill}" d="{d}"/><path fill="{rune_fill}" opacity="0.9" d="{rd}"/>', w


def svg(w, h, body, label='Synthetic Practitioner'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" role="img" aria-label="{label}">\n'
            f'<title>{label}</title>\n  {body}\n</svg>\n')


def write(name, content):
    with open(os.path.join(OUT, name), 'w') as fh:
        fh.write(content)


def cosmos(w, h, uid, stars=True, seed=7):
    """Deep green cosmos with an etched grid and a sprinkle of frost and gold stars."""
    body = [f'''<defs><radialGradient id="{uid}cosmos" gradientUnits="userSpaceOnUse" cx="{f(w * 0.3)}" cy="{f(-h * 0.2)}" r="{f(max(w, h) * 1.05)}">
      <stop offset="0%" stop-color="#153d34"/><stop offset="42%" stop-color="{DEEP}"/><stop offset="78%" stop-color="{VOID}"/></radialGradient>
    <pattern id="{uid}grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="{GOLD}" stroke-opacity="0.05"/></pattern></defs>''',
            f'<rect width="{f(w)}" height="{f(h)}" fill="url(#{uid}cosmos)"/>',
            f'<rect width="{f(w)}" height="{f(h)}" fill="url(#{uid}grid)"/>']
    if stars:
        rnd = random.Random(seed)
        for i in range(int(w * h / 5200)):
            r = rnd.choice([0.6, 0.8, 1.0, 1.3, 1.7])
            body.append(f'<circle cx="{f(rnd.uniform(0, w))}" cy="{f(rnd.uniform(0, h))}" r="{r}" '
                        f'fill="{GOLD if i % 5 == 0 else FROST}" opacity="{f(rnd.uniform(0.2, 0.75))}"/>')
    return '\n  '.join(body)


# ─── Build ────────────────────────────────────────────────────────────────
def build():
    # Seals
    write('seal.svg', svg(900, 900, seal(450, 450, 440, 's')))
    write('seal-simple.svg', svg(96, 96, seal(48, 48, 44, 'ss', runes=False)))
    write('favicon.svg', svg(64, 64, seal(32, 32, 29.5, 'fv', runes=False)))

    # Lockups: seal + wordmark + runes. Light backgrounds get ink, dark get gold.
    for name, fill, rune_fill in (('logo.svg', INK, GREEN), ('logo-dark.svg', 'gold', GOLD)):
        wm, w = wordmark(120, 60, 46, 'w', fill, rune_fill)
        write(name, svg(120 + w + 4, 100, seal(50, 50, 48, 'l') + '\n  ' + wm))

    # App icon: full-bleed cosmos, simplified seal inside the maskable safe zone
    write('app-icon.svg', svg(512, 512, cosmos(512, 512, 'ai', stars=False) + '\n  ' + seal(256, 256, 176, 'ai', runes=False)))

    # Starfield for dark sections of the site
    write('stars.svg', svg(1200, 600, cosmos(1200, 600, 'st', seed=11).split('\n  ', 3)[-1], 'Stars'))

    # Social images (1200×630), English and Danish
    for lang, label, lines, sub in (
        ('en', 'AI GENERAL PRACTITIONER', ('Feeling poorly?', 'Let’s talk.'), 'Chat, call or video, day and night. Join the waitlist.'),
        ('da', 'AI-DOKTOR TIL HELE FAMILIEN', ('Føler du dig sløj?', 'Lad os snakke.'), 'Chat, opkald eller video, dag og nat. Skriv dig op.'),
    ):
        W, H, X = 1200, 630, 560
        parts = [cosmos(W, H, 'og'), seal(290, 315, 225, 'og')]
        lab, _ = MONO.run(label, X + 44, 150, 19, tracking=0.12)
        parts.append(f'<defs><linearGradient id="ogline" x1="0" x2="1">{stops(AURORA)}</linearGradient></defs>'
                     f'<rect x="{X}" y="142" width="30" height="3" rx="1.5" fill="url(#ogline)"/><path fill="{GOLD}" d="{lab}"/>')
        wm, _ = wordmark(X, 232, 58, 'ogw', 'gold', GOLD)
        parts.append(wm)
        for i, line in enumerate(lines):
            d, _ = SG.run(line, X, 360 + i * 60, 52, tracking=-0.02)
            parts.append(f'<path fill="{FROST}" d="{d}"/>')
        d, _ = SG.run(sub, X, 470, 22)
        parts.append(f'<path fill="#9fb3ad" d="{d}"/>')
        d, _ = MONO.run('synthetic practitioner · by vaerksted.ai', X, 540, 17)
        parts.append(f'<path fill="#8B939F" d="{d}"/>')
        write(f'og-image{"-da" if lang == "da" else ""}.svg', svg(W, H, '\n  '.join(parts)))


build()
print('brand written to', os.path.abspath(OUT))
