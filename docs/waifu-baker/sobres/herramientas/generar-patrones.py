# Genera patrones originales y repetibles (sin costuras) para el holo del marco.
# Cada patrón es una máscara: blanco con transparencia; el alfa decide dónde va el holo de dentro.
import sys, os
import numpy as np
from PIL import Image

N = 512
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(29102026)
y, x = np.mgrid[0:N, 0:N] / N          # coordenadas 0..1, periódicas


def ruido(frec_max, semilla, potencia=1.6):
    """Ruido suave periódico: espectro aleatorio solo con frecuencias enteras bajas."""
    r = np.random.default_rng(semilla)
    fx = np.fft.fftfreq(N) * N
    FX, FY = np.meshgrid(fx, fx)
    f = np.sqrt(FX ** 2 + FY ** 2)
    espectro = (r.normal(size=(N, N)) + 1j * r.normal(size=(N, N))) * (f > 0) * (f <= frec_max) / np.maximum(f, 1) ** potencia
    n = np.real(np.fft.ifft2(espectro))
    return (n - n.min()) / (n.max() - n.min()) * 2 - 1


def suave(a, b, v):
    k = np.clip((v - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def guardar(nombre, alfa):
    a = (np.clip(alfa, 0, 1) * 255).astype(np.uint8)
    im = Image.new('RGBA', (N, N), (255, 255, 255, 0))
    im.putalpha(Image.fromarray(a))
    im.save(os.path.join(OUT, nombre + '.webp'), 'WEBP', quality=88, method=6)


# 1. Remolinos: mármol con vetas que se enroscan (deformación de dominio periódica)
n1, n2 = ruido(6, 1), ruido(10, 2)
fase = 2 * np.pi * (3 * x + 2 * y) + 5.5 * n1 + 2.2 * n2
v = np.sin(fase)
guardar('remolinos', 1 - suave(0.08, 0.42, np.abs(v)))

# 2. Ondas: bandas onduladas horizontales
w = np.sin(2 * np.pi * (7 * y + 0.35 * np.sin(2 * np.pi * (2 * x + y)) + 0.25 * ruido(4, 3)))
guardar('ondas', suave(0.35, 0.9, w))

# 3. Hielo roto: fragmentos (Voronoi periódico); cada fragmento con su brillo y aristas claras
puntos = rng.random((70, 2))
d1 = np.full((N, N), 9.0); d2 = np.full((N, N), 9.0); idx = np.zeros((N, N), int)
for i, (px, py) in enumerate(puntos):
    dx = np.abs(x - px); dx = np.minimum(dx, 1 - dx)
    dy = np.abs(y - py); dy = np.minimum(dy, 1 - dy)
    d = np.sqrt(dx ** 2 + dy ** 2)
    m = d < d1
    d2 = np.where(m, d1, np.minimum(d2, d)); idx = np.where(m, i, idx); d1 = np.where(m, d, d1)
brillo = rng.uniform(0.15, 0.95, len(puntos))[idx]
arista = 1 - suave(0.0, 0.012, d2 - d1)
guardar('hielo', np.maximum(brillo * (0.55 + 0.45 * np.sin(2 * np.pi * (x * 3 + y * 5))) * 0.9, arista))

# 4. Estrellas: estrellas de cuatro puntas y puntitos repartidos
alfa = np.zeros((N, N))
for _ in range(90):
    cx, cy = rng.random(2); r = rng.uniform(0.012, 0.04); grosor = r * 0.22
    dx = x - cx; dx -= np.round(dx); dy = y - cy; dy -= np.round(dy)
    estrella = np.maximum(1 - suave(0, grosor, np.abs(dx)) , 0) * (np.abs(dy) < r) * (1 - np.abs(dy) / r)
    estrella = np.maximum(estrella, (1 - suave(0, grosor, np.abs(dy))) * (np.abs(dx) < r) * (1 - np.abs(dx) / r))
    alfa = np.maximum(alfa, estrella)
for _ in range(260):
    cx, cy = rng.random(2); r = rng.uniform(0.002, 0.006)
    dx = x - cx; dx -= np.round(dx); dy = y - cy; dy -= np.round(dy)
    alfa = np.maximum(alfa, 1 - suave(r * 0.4, r, np.sqrt(dx ** 2 + dy ** 2)))
guardar('estrellas', alfa)

# 5. Panal: rejilla hexagonal de líneas
escala = 10
qx = x * escala * 2 / np.sqrt(3)
qy = y * escala * 2 + qx * 0          # proporción ajustada para repetir en 512
def hexdist(px, py):
    px = np.abs(px); py = np.abs(py)
    return np.maximum(px * 0.866025 + py * 0.5, py)
gx = x * 12; gy = y * 14
cx = np.floor(gx) + 0.5; cy = np.floor(gy) + 0.5
filas = np.floor(gy).astype(int) % 2
gx2 = gx + 0.5 * filas
cx2 = np.floor(gx2) + 0.5
d = hexdist((gx2 - cx2) * 1.0, (gy - cy) * 1.15)
guardar('panal', suave(0.38, 0.47, d) * 0.9 + 0.1)

# 6. Diagonales: franjas diagonales de distinto grosor
t = (x + y) * 18
franja = np.abs(np.sin(np.pi * t)) ** 0.5
grueso = 0.5 + 0.5 * np.sin(2 * np.pi * (x - y) * 2)
guardar('diagonales', suave(0.55 - 0.25 * grueso, 0.85 - 0.2 * grueso, franja))

# 7. Puntos: semitono de puntos grandes y chicos
gx = (x * 24) % 1 - 0.5; gy = (y * 24) % 1 - 0.5
radio = 0.22 + 0.16 * (0.5 + 0.5 * np.sin(2 * np.pi * (x * 2 + y * 3)))
guardar('puntos', 1 - suave(radio - 0.04, radio, np.sqrt(gx ** 2 + gy ** 2)))
print('ok', sorted(os.listdir(OUT)))


# ---------- v7: patrones para el brillo "ondas" del fondo ----------

# 8. Estelas: arcos largos tipo cometa que cruzan de abajo-izquierda a arriba-derecha (proporción de carta)
W, H = 700, 1000
yy, xx = np.mgrid[0:H, 0:W].astype(float)
r2 = np.random.default_rng(71)
alfa = np.zeros((H, W))
for k in range(78):
    fino = k >= 40
    cx, cy = W * r2.uniform(0.7, 1.9), H * r2.uniform(1.05, 2.0)
    p0 = (W * r2.uniform(-0.1, 1.0), H * r2.uniform(0.0, 1.0))
    R = np.hypot(p0[0] - cx, p0[1] - cy)
    a0 = np.arctan2(p0[1] - cy, p0[0] - cx)
    largo = r2.uniform(220, 900) if not fino else r2.uniform(120, 500)
    span = largo / R
    dist = np.hypot(xx - cx, yy - cy)
    ang = np.arctan2(yy - cy, xx - cx) - a0
    ang = (ang + np.pi) % (2 * np.pi) - np.pi
    t = ang / span                                   # -1 cola, +1 cabeza
    perfil = np.clip((t + 1) / 2, 0, 1) ** 1.6 * (1 - suave(0.82, 1.0, t))
    w = (r2.uniform(0.7, 1.6) if fino else r2.uniform(2.0, 7.5)) * (0.45 + 0.55 * np.clip((t + 1) / 2, 0, 1))
    d = np.abs(dist - R)
    luz = r2.uniform(0.55, 1.0)
    trazo = (np.exp(-(d / w) ** 2) + 0.22 * np.exp(-(d / (w * 4.5)) ** 2)) * perfil * luz
    alfa = np.maximum(alfa, trazo)
a = (np.clip(alfa, 0, 1) * 255).astype(np.uint8)
im = Image.new('RGBA', (W, H), (255, 255, 255, 0)); im.putalpha(Image.fromarray(a))
im.save(os.path.join(OUT, 'estelas.webp'), 'WEBP', quality=88, method=6)

# 9. Aurora: líneas finas onduladas que fluyen en diagonal y se desvanecen por tramos (repetible)
fase = 2 * np.pi * (6 * y - 2 * x) + 3.2 * ruido(4, 11) + 1.1 * ruido(8, 12)
linea = 1 - suave(0.0, 0.16, np.abs(np.sin(fase / 2)))
tramos = suave(-0.35, 0.55, ruido(5, 13))
fina = (1 - suave(0.0, 0.05, np.abs(np.sin(fase)))) * 0.5
guardar('aurora', np.maximum(linea, fina) * (0.25 + 0.75 * tramos))
print('ok v7', sorted(os.listdir(OUT)))
