"""Generate the Synthetic Practitioner brand SVGs into public/brand/.

The mark is a Selbu rose (the eight-petal star of Scandinavian knitwear) charted
stitch by stitch on a 13 × 13 grid. A knitting chart is a grid of pixels, so the
mark is Nordic craft and digital at once. The four long petals join into a medical
plus; one glowing mint stitch sits at the heart. All text is outlined, so the SVGs
need no fonts installed.

    pip install fonttools uharfbuzz
    python3 scripts/build-brand.py

Fonts are fetched from the Google Fonts repository on GitHub. PNGs (icons, social
images) are rendered from the SVGs in a headless browser (see README).
"""
import io
import os
import sys
import urllib.request

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'brand')
os.makedirs(OUT, exist_ok=True)

# ─── Palette ──────────────────────────────────────────────────────────────
GREEN = '#1e6b5c'      # scrubs green
WASHED = '#7fb5a6'     # washed scrubs
MINT = '#3fd3a4'       # the AI's glow
INK = '#10211d'
FOREST = '#0e3b33'     # dark sections
WHITE = '#ffffff'

# Colour sets for the mark: (plus, diagonal petals, heart stitch)
ON_LIGHT = (GREEN, WASHED, MINT)
ON_DARK = (WHITE, '#a7dccd', '#6ff0c4')
MONO_INK = (INK, INK, INK)

# ─── The stitch chart ─────────────────────────────────────────────────────
# One cardinal petal and one diagonal petal as (dx, dy) stitches from the centre,
# dy pointing up. The cardinal petal reaches the centre, so the four join into a plus.
PLUS_PETAL = [(0, 6), (-1, 5), (0, 5), (1, 5), (-1, 4), (0, 4), (1, 4), (-1, 3), (0, 3), (1, 3), (0, 2), (0, 1)]
DIAG_PETAL = [(2, 2), (3, 3), (3, 4), (4, 3), (4, 4), (5, 5)]
GRID = 13


def chart():
    cells = {}
    for kind, petal in (('plus', PLUS_PETAL), ('diag', DIAG_PETAL)):
        for dx, dy in petal:
            for x, y in ((dx, dy), (dy, -dx), (-dx, -dy), (-dy, dx)):
                cells[(x, y)] = kind
    cells[(0, 0)] = 'heart'
    return cells


CELLS = chart()


def mark(x, y, size, colors):
    """The stitched rose in a size × size box at (x, y)."""
    plus, diag, heart = colors
    fill = {'plus': plus, 'diag': diag, 'heart': heart}
    cs = size / GRID
    gap, r = cs * 0.16, cs * 0.18
    c = GRID // 2
    rects = [f'<rect x="{f(x + (c + dx) * cs + gap / 2)}" y="{f(y + (c - dy) * cs + gap / 2)}" '
             f'width="{f(cs - gap)}" height="{f(cs - gap)}" rx="{f(r)}" fill="{fill[k]}"/>'
             for (dx, dy), k in sorted(CELLS.items())]
    return '<g>' + ''.join(rects) + '</g>'


# ─── Fonts ────────────────────────────────────────────────────────────────
GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'


class Face:
    def __init__(self, path, wght):
        self.blob = urllib.request.urlopen(GF + path).read()
        self.wght = wght
        self.font = instantiateVariableFont(TTFont(io.BytesIO(self.blob)), {'wght': wght})
        self.upm = self.font['head'].unitsPerEm
        self.glyphs = self.font.getGlyphSet()
        self.order = self.font.getGlyphOrder()

    def run(self, text, x, y, size, tracking=0.0):
        """Outline shaped text with its baseline at y. Returns (path data, width)."""
        hbf = hb.Font(hb.Face(self.blob))
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


SANS = Face('albertsans/AlbertSans%5Bwght%5D.ttf', 600)
SANS_REG = Face('albertsans/AlbertSans%5Bwght%5D.ttf', 400)
MONO = Face('geistmono/GeistMono%5Bwght%5D.ttf', 500)


def f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def svg(w, h, body, label='Synthetic Practitioner'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" role="img" aria-label="{label}">\n'
            f'<title>{label}</title>\n{body}\n</svg>\n')


def write(name, content):
    with open(os.path.join(OUT, name), 'w') as fh:
        fh.write(content)


def stitch_grid(w, h, uid, color=WHITE, opacity=0.06, step=16):
    """A faint grid of stitches: the knitting chart the mark is drawn on."""
    return (f'<defs><pattern id="{uid}" width="{step}" height="{step}" patternUnits="userSpaceOnUse">'
            f'<rect x="{step / 2 - 1.5}" y="{step / 2 - 1.5}" width="3" height="3" rx=".6" fill="{color}" fill-opacity="{opacity}"/></pattern></defs>'
            f'<rect width="{f(w)}" height="{f(h)}" fill="url(#{uid})"/>')


# ─── Build ────────────────────────────────────────────────────────────────
def build():
    write('mark.svg', svg(64, 64, mark(0, 0, 64, ON_LIGHT)))
    write('mark-white.svg', svg(64, 64, mark(0, 0, 64, ON_DARK)))
    write('mark-mono.svg', svg(64, 64, mark(0, 0, 64, MONO_INK)))

    # Horizontal logo: mark + lowercase wordmark
    word, ww = SANS.run('synthetic practitioner', 78, 41, 30, tracking=-0.015)
    for name, colors, text in (('logo.svg', ON_LIGHT, INK), ('logo-white.svg', ON_DARK, WHITE)):
        write(name, svg(78 + ww + 2, 64, mark(0, 0, 64, colors) + f'\n<path fill="{text}" d="{word}"/>'))

    # Tile: white mark on scrubs green. App icon is full-bleed; favicon is rounded.
    write('app-icon.svg', svg(512, 512, f'<rect width="512" height="512" fill="{GREEN}"/>' + mark(106, 106, 300, ON_DARK)))
    write('favicon.svg', svg(64, 64, f'<rect width="64" height="64" rx="14" fill="{GREEN}"/>' + mark(7, 7, 50, ON_DARK)))

    # Social images (1200 × 630), English and Danish
    for suffix, label, lines, sub in (
        ('', 'AI GENERAL PRACTITIONER', ('Feeling poorly?', 'Let’s talk.'), 'Chat, call or video, day and night. Join the waitlist.'),
        ('-da', 'AI-DOKTOR TIL HELE FAMILIEN', ('Føler du dig sløj?', 'Lad os snakke.'), 'Chat, opkald eller video, dag og nat. Skriv dig op.'),
    ):
        W, H, X = 1200, 630, 80
        parts = [f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15493f"/><stop offset="1" stop-color="{FOREST}"/></linearGradient></defs>',
                 f'<rect width="{W}" height="{H}" fill="url(#bg)"/>', stitch_grid(W, H, 'st'),
                 f'<g opacity=".12">{mark(760, 150, 520, (WHITE, WHITE, WHITE))}</g>',
                 mark(X, 72, 56, ON_DARK)]
        d, _ = SANS.run('synthetic practitioner', X + 72, 110, 30, tracking=-0.015)
        parts.append(f'<path fill="{WHITE}" d="{d}"/>')
        # Label, led by three stitches (the site's eyebrow style)
        parts.append(''.join(f'<rect x="{X + i * 8}" y="204" width="6" height="6" rx="1" fill="{MINT}"/>' for i in range(3)))
        d, _ = MONO.run(label, X + 34, 214, 18, tracking=0.12)
        parts.append(f'<path fill="#9fe3cc" d="{d}"/>')
        for i, line in enumerate(lines):
            d, _ = SANS.run(line, X, 318 + i * 84, 80, tracking=-0.025)
            parts.append(f'<path fill="{WHITE}" d="{d}"/>')
        d, _ = SANS_REG.run(sub, X, 510, 28)
        parts.append(f'<path fill="#b9d8cf" d="{d}"/>')
        d, _ = MONO.run('an idea by vaerksted.ai', X, 566, 17)
        parts.append(f'<path fill="#8fb3a9" d="{d}"/>')
        write(f'og-image{suffix}.svg', svg(W, H, '\n'.join(parts)))


build()
print('brand written to', os.path.abspath(OUT))
