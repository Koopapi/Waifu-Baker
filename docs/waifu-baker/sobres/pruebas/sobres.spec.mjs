// Pruebas del creador de sobres y de la apertura. Uso: npm install && npx playwright install chromium && npx playwright test
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const FIXTURE = new URL('./capa-800x1200.png', import.meta.url).pathname;
const REGISTRO = new URL('../src/sobres/fa01.json', import.meta.url);

function vigilarErrores(page) {
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => {
    // Sin internet, Google Fonts falla: no cuenta como error del creador.
    if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|ERR_NAME|ERR_CONNECTION|ERR_INTERNET/.test(m.text())) errores.push(m.text());
  });
  return errores;
}
async function leerJSON(page) { return JSON.parse(await page.textContent('#json')); }
async function abrirCreador(page) {
  await page.goto('creador-sobres.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#layers .ly')).toHaveCount(4);
}
// Arrastra por la línea de rasgado (y = 230 de 1750) de izquierda a derecha.
async function rasgar(page, sel = '#host') {
  await page.evaluate(() => window.scrollTo(0, 0));
  const r = await page.locator(sel).boundingBox();
  const y = r.y + r.height * 230 / 1750;
  await page.mouse.move(r.x + r.width * 0.06, y);
  await page.mouse.down();
  for (let i = 1; i <= 22; i++) { await page.mouse.move(r.x + r.width * (0.06 + i * 0.042), y); await page.waitForTimeout(15); }
  await page.mouse.up();
}

test('el creador carga el ejemplo FA01 sin errores y sin avisos', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrirCreador(page);
  await expect(page.locator('#fijas .ly')).toHaveCount(5); // plástico, banda, logo, sellos, foil
  await expect(page.locator('#revision li.bien')).toHaveCount(1);
  await expect(page.locator('#indicacion')).toHaveText('Desliza el dedo por la línea');
  expect(await page.evaluate(() => [window.CartaCapas.version, window.SobreCapas.version])).toEqual([7, 1]);
  expect(errores).toEqual([]);
});

test('el registro exportado es igual al de src/sobres/fa01.json', async ({ page }) => {
  await abrirCreador(page);
  const esperado = JSON.parse(await readFile(REGISTRO, 'utf8'));
  expect(await leerJSON(page)).toEqual(esperado);
});

test('3D usa la silueta del plástico; plano usa dientes recortados y no pinta el plástico', async ({ page }) => {
  await abrirCreador(page);
  const estilo = () => page.evaluate(() => {
    const parte = document.querySelector('#host .sc-parte'), pl = document.querySelector('#host .sc-pl-brillo');
    return { mascara: getComputedStyle(parte).maskImage, recorte: parte.style.clipPath, plastico: getComputedStyle(pl).display };
  });
  let e = await estilo();
  expect(e.mascara).toContain('plastico-silueta.webp');
  expect(e.plastico).toBe('block');
  await page.click('#qVista [data-v=plano]');
  await expect.poll(async () => (await estilo()).plastico).toBe('none');
  e = await estilo();
  expect(e.mascara).toBe('none');
  expect(e.recorte).toContain('polygon(');
  expect((await leerJSON(page)).vista).toBe('plano');
});

test('rasgar por la línea abre el sobre; las cartas salen derechas y solo se ve la de arriba', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrirCreador(page);
  await expect(page.locator('#mazo')).toHaveClass(/oculto/); // cerradas: no se asoman detrás del sobre
  await rasgar(page);
  await expect(page.locator('#indicacion')).toHaveText('Yuki · N · 1 de 5', { timeout: 5000 });
  const cartas = await page.evaluate(() => [...document.querySelectorAll('#mazo .carta-w')].map((w) => [w.style.transform, w.style.visibility]));
  expect(cartas.filter(([, v]) => v !== 'hidden')).toHaveLength(1);
  expect(cartas.every(([t]) => t === '')).toBe(true);
  for (let i = 0; i < 5; i++) await page.click('#btnSiguiente', { force: true }).catch(() => {});
  await expect(page.locator('#indicacion')).toHaveText('Así se abre tu sobre');
  await page.click('#btnCerrar');
  await expect(page.locator('#indicacion')).toHaveText('Desliza el dedo por la línea');
  expect(errores).toEqual([]);
});

test('sticker: cambia la indicación y se abre despegando hacia la derecha', async ({ page }) => {
  await abrirCreador(page);
  await page.click('#qApertura [data-v=sticker]');
  await expect(page.locator('#indicacion')).toHaveText('Despega el sticker de arriba →');
  await page.evaluate(() => window.scrollTo(0, 0)); // el botón está abajo: al pulsarlo la página bajó
  const r = await page.locator('#host').boundingBox();
  const y = r.y + r.height * 0.07;
  await page.mouse.move(r.x + r.width * 0.12, y);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) { await page.mouse.move(r.x + r.width * (0.12 + i * 0.04), y); await page.waitForTimeout(15); }
  await page.mouse.up();
  await expect(page.locator('#indicacion')).toHaveText(/Yuki · N/, { timeout: 5000 });
  expect((await leerJSON(page)).apertura).toBe('sticker');
});

test('las opciones del sobre llegan al registro y a la vista', async ({ page }) => {
  await abrirCreador(page);
  await page.fill('#sCodigo', 'FA02');
  await page.check('#sInsOn');
  await page.click('#selPatrones [data-p=liquido]');
  await page.check('#sHolo');
  await page.fill('#sNombre', 'UN NOMBRE DE SET MUY LARGO');
  await expect.poll(async () => (await leerJSON(page)).holo).toBe(true); // el registro se actualiza en el siguiente cuadro
  const j = await leerJSON(page);
  expect(j.id).toBe('fa02');
  expect(j.capas[0].src).toBe('sobres/fa02/sobre_fa01_fondo.webp');
  expect(j.insignia).toEqual({ texto: 'Edición especial', color: '#C6F432' });
  expect(j.sellos).toEqual({ arriba: '#FF3EA5', abajo: '#C6F432', patron: 'marcos/patrones/liquido.webp', patronTamano: 40 });
  expect(j.holo).toBe(true);
  await expect(page.locator('#host .sc-insignia').first()).toBeVisible();
  // un nombre largo se achica para caber en la banda
  const tam = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#host .sc-banda strong')).fontSize));
  const ancho = await page.evaluate(() => document.querySelector('#host').getBoundingClientRect().width);
  expect(tam).toBeLessThan(ancho * 0.076 * 0.8);
});

test('la revisión avisa de medidas equivocadas y de lo que cruza la línea de rasgado', async ({ page }) => {
  await abrirCreador(page);
  await page.setInputFiles('#fileIn', FIXTURE);
  await expect(page.locator('#revision li')).toHaveCount(2);
  const avisos = await page.locator('#revision li').allTextContents();
  expect(avisos.join(' ')).toContain('mide 800 × 1200');
  expect(avisos.join(' ')).toContain('cruza la línea de rasgado');
});

test('la miniatura es un PNG de 500 × 875', async ({ page }) => {
  await abrirCreador(page);
  const medida = await page.evaluate(async () => {
    const b = await window.__miniatura();
    const bmp = await createImageBitmap(b);
    return [b.type, bmp.width, bmp.height];
  });
  expect(medida).toEqual(['image/png', 500, 875]);
});

test('la apertura del juego: rasgar, pasar las 5 cartas y ver el resumen', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('apertura-sobre.html');
  await expect(page.locator('#indicacion')).toHaveText('Desliza el dedo por la línea');
  await rasgar(page);
  await expect(page.locator('#indicacion')).toHaveText('Yuki · N · 1 de 5', { timeout: 5000 });
  for (let i = 0; i < 4; i++) await page.click('#btnAccion');
  await expect(page.locator('#indicacion')).toHaveText('¡Yuki · SSR! · 5 de 5');
  await expect(page.locator('#estrella')).toHaveClass(/on/);
  await page.click('#btnAccion');
  await expect(page.locator('#rejilla figure')).toHaveCount(5);
  await page.click('#btnAccion');
  await expect(page.locator('#indicacion')).toHaveText('Desliza el dedo por la línea');
  expect(errores).toEqual([]);
});

test('en celular el creador no se desborda a lo ancho', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirCreador(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
