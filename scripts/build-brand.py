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
GREEN, INK, WHITE = '#1e6b5c', '#10211d', '#ffffff'
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

def mark(color, ox=0, oy=0, s=1.0, uid='m'):
    """Speech bubble carrying an off-centre Nordic cross (Danish flag proportions)."""
    return f'''<g transform="translate({ox} {oy}) scale({s})">
  <mask id="{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
    <rect x="4" y="4" width="56" height="48" rx="14" fill="#fff"/><path d="M36 50 50 61V44z" fill="#fff"/>
    <rect x="0" y="24.5" width="64" height="7" fill="#000"/><rect x="23.5" y="0" width="7" height="64" fill="#000"/>
  </mask>
  <rect width="64" height="64" fill="{color}" mask="url(#{uid})"/>
</g>'''

def svg(w, h, body, title='Synthetic Practitioner'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h:.1f}" role="img" aria-label="{title}">\n<title>{title}</title>\n{body}\n</svg>\n'

def write(name, content):
    open(os.path.join(OUT, name), 'w').write(content)

WORD = 'synthetic practitioner'
W8 = 600

# Mark only
for name, c in [('mark.svg', GREEN), ('mark-white.svg', WHITE), ('mark-black.svg', INK)]:
    write(name, svg(64, 64, mark(c)))

# Horizontal lockup: mark + wordmark
d, tw = text_path(WORD, W8, 30, 80, 39, tracking=-0.01)
W = 80 + tw + 2
for name, mc, tc in [('logo.svg', GREEN, INK), ('logo-white.svg', WHITE, WHITE), ('logo-black.svg', INK, INK)]:
    write(name, svg(W, 64, mark(mc) + f'\n<path d="{d}" fill="{tc}"/>'))

# Stacked lockup: mark above two-line wordmark
d1, w1 = text_path('synthetic', W8, 30, 0, 0, -0.01)
d2, w2 = text_path('practitioner', W8, 30, 0, 0, -0.01)
SW = max(w1, w2, 64)
def centred(dd, ww, y): return f'<path transform="translate({(SW - ww) / 2:.2f} {y})" d="{dd}"'
for name, mc, tc in [('logo-stacked.svg', GREEN, INK), ('logo-stacked-white.svg', WHITE, WHITE)]:
    write(name, svg(SW, 150, mark(mc, (SW - 64) / 2, 0) + '\n' + centred(d1, w1, 102) + f' fill="{tc}"/>\n' + centred(d2, w2, 138) + f' fill="{tc}"/>'))

# App icon: white mark on a full-bleed green square (used for favicon PNGs / touch icon)
write('app-icon.svg', svg(512, 512, f'<rect width="512" height="512" fill="{GREEN}"/>' + mark(WHITE, 96, 104, 5)))
# Favicon: plain mark, readable at 16px
write('favicon.svg', svg(64, 64, mark(GREEN, uid='f')))
print('wordmark width', round(tw, 1), 'stacked width', round(SW, 1))
