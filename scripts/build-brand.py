"""Generate the Synthetic Practitioner logo SVGs in public/brand/ (wordmark outlined in Albert Sans).

    pip install fonttools uharfbuzz
    python3 scripts/build-brand.py

PNG icons and social images are rendered from these SVGs (see README).
"""
import io, os, sys, urllib.request
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'brand')
os.makedirs(OUT, exist_ok=True)
GREEN, SCRUB, INK, WHITE = '#1e6b5c', '#7fb5a6', '#10211d', '#ffffff'
FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/albertsans/AlbertSans%5Bwght%5D.ttf'
_blob = urllib.request.urlopen(FONT_URL).read()
_fonts = {}

def font_at(weight):
    if weight not in _fonts:
        f = TTFont(io.BytesIO(_blob))
        _fonts[weight] = instantiateVariableFont(f, {'wght': weight})
    return _fonts[weight]

def text_path(text, weight, size, x0, baseline, tracking=0.0):
    """Outline `text` as one SVG path. Returns (d, advance width)."""
    tt = font_at(weight)
    face = hb.Face(_blob); hbf = hb.Font(face); hbf.set_variations({'wght': weight})
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    upem = tt['head'].unitsPerEm; scale = size / upem
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    pen = SVGPathPen(gs); x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tp = TransformPen(pen, (scale, 0, 0, -scale, x0 + (x + pos.x_offset) * scale, baseline - pos.y_offset * scale))
        gs[name].draw(tp)
        x += pos.x_advance + tracking * upem
    return pen.getCommands(), (x - tracking * upem) * scale

def lens(inner, tip, w):
    """A pointed petal on the vertical axis, from radius `inner` to `tip`, half-width `w`."""
    L = tip - inner
    r = (L * L / 4 + w * w) / (2 * w)
    return f"M32 {32 - inner:.2f} A{r:.2f} {r:.2f} 0 0 1 32 {32 - tip:.2f} A{r:.2f} {r:.2f} 0 0 1 32 {32 - inner:.2f}Z"

BIG, SMALL = lens(6, 30, 7.4), lens(7, 21.5, 4.8)

def mark(color, ox=0, oy=0, s=1.0, uid='m', accent=None):
    """Selbu rose: the eight-petal star of Scandinavian knitwear, drawn as a healing flower.
    The four long petals form a medical plus; the short diagonal petals take `accent`
    (two-tone logo) or the main colour (one-colour logo). A thin gap is cut around them."""
    petals = lambda d, angles, fill, extra='': ''.join(
        f'<path d="{d}" fill="{fill}"{extra} transform="rotate({a} 32 32)"/>' for a in angles)
    return f'''<g transform="translate({ox} {oy}) scale({s})">
  <mask id="{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
    <rect width="64" height="64" fill="#fff"/>{petals(SMALL, (45, 135, 225, 315), '#000', ' stroke="#000" stroke-width="3.6"')}
  </mask>
  <g mask="url(#{uid})">{petals(BIG, (0, 90, 180, 270), color)}</g>
  {petals(SMALL, (45, 135, 225, 315), accent or color)}
  <circle cx="32" cy="32" r="3.2" fill="{color}"/>
</g>'''

def svg(w, h, body, title='Synthetic Practitioner'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" role="img" aria-label="{title}">\n<title>{title}</title>\n{body}\n</svg>\n'

def write(name, content):
    open(os.path.join(OUT, name), 'w').write(content)

WORD = 'synthetic practitioner'
W8 = 600

# Mark only
for name, c, a in [('mark.svg', GREEN, SCRUB), ('mark-white.svg', WHITE, None), ('mark-black.svg', INK, None)]:
    write(name, svg(64, 64, mark(c, accent=a)))

# Horizontal lockup: mark + wordmark
d, tw = text_path(WORD, W8, 30, 80, 39, tracking=-0.01)
W = 80 + tw + 2
for name, mc, a, tc in [('logo.svg', GREEN, SCRUB, INK), ('logo-white.svg', WHITE, None, WHITE), ('logo-black.svg', INK, None, INK)]:
    write(name, svg(W, 64, mark(mc, accent=a) + f'\n<path d="{d}" fill="{tc}"/>'))

# Stacked lockup: mark above two-line wordmark
d1, w1 = text_path('synthetic', W8, 30, 0, 0, -0.01)
d2, w2 = text_path('practitioner', W8, 30, 0, 0, -0.01)
SW = max(w1, w2, 64)
def centred(dd, ww, y): return f'<path transform="translate({(SW - ww) / 2:.2f} {y})" d="{dd}"'
for name, mc, a, tc in [('logo-stacked.svg', GREEN, SCRUB, INK), ('logo-stacked-white.svg', WHITE, None, WHITE)]:
    write(name, svg(SW, 150, mark(mc, (SW - 64) / 2, 0, accent=a) + '\n' + centred(d1, w1, 102) + f' fill="{tc}"/>\n' + centred(d2, w2, 138) + f' fill="{tc}"/>'))

# App icon: white mark on a full-bleed green square (used for favicon PNGs / touch icon)
write('app-icon.svg', svg(512, 512, f'<rect width="512" height="512" fill="{GREEN}"/>' + mark(WHITE, 72, 72, 5.75, accent='#a9d4c7')))
# Favicon: white rose on a rounded green tile, which stays legible at 16px
write('favicon.svg', svg(64, 64, f'<rect width="64" height="64" rx="14" fill="{GREEN}"/>' + mark(WHITE, 5.12, 5.12, 0.84, uid='f', accent='#a9d4c7')))
print('wordmark width', round(tw, 1), 'stacked width', round(SW, 1))
