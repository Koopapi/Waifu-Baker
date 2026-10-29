import { test, expect } from '@playwright/test';

// Las fuentes de Google pueden no cargar en entornos sin internet: esos errores no cuentan.
function vigilarErrores(page) {
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_NAME|net::/.test(m.text())) errores.push(m.text()); });
  return errores;
}
async function abrirCapa(page, nombre) {
  return page.evaluate((nombre) => {
    const lis = [...document.querySelectorAll('#layers .ly')];
    const li = lis.find((l) => l.textContent.includes(nombre));
    li.querySelector('details').open = true;
    return lis.indexOf(li) + 1;
  }, nombre);
}
const leerJSON = async (page) => JSON.parse(await page.textContent('#json'));

test('carga con la carta de ejemplo y carta-capas v4', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('creador-cartas.html');
  await expect(page.locator('#layers .ly')).toHaveCount(5);
  expect(await page.evaluate(() => window.CartaCapas.version)).toBe(4);
  await expect(page.locator('#host .cc-capa img')).toHaveCount(4);
  await expect(page.locator('#marcos .chip').first()).toHaveText('EX');
  const json = await leerJSON(page);
  expect(json.marco).toBe('ssr');
  expect(json.capas).toHaveLength(5);
  expect(errores).toEqual([]);
});

test('brillo solo en el dibujo de una capa', async ({ page }) => {
  await page.goto('creador-cartas.html');
  const n = await abrirCapa(page, 'personaje');
  await page.selectOption(`#layers .ly:nth-child(${n}) select[data-k=brilloTipo]`, 'holo');
  const brillo = page.locator('#host .cc-brillo-holo');
  await expect(brillo).toHaveCount(1);
  const mascara = await brillo.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
  expect(mascara).toContain('yuki_3_personaje.webp');
  const capa = (await leerJSON(page)).capas.find((c) => c.src && c.src.includes('personaje'));
  expect(capa.brillo).toEqual({ tipo: 'holo', intensidad: 0.7 });
});

test('rareza EX con holo e intensidad', async ({ page }) => {
  await page.goto('creador-cartas.html');
  await page.click('#selloTipo [data-t=ninguno]');
  await page.click('#marcos [data-m=ex]');
  await page.click('#aplicarRareza');
  await expect(page.locator('#host .cc-sello-texto b')).toHaveAttribute('data-t', 'EX');
  await expect(page.locator('#qHoloCtl')).toBeVisible();
  await page.locator('#qHoloI').fill('0.8');
  const i = await page.locator('#host .cc-card').evaluate((el) => el.style.getPropertyValue('--cc-holo-i'));
  expect(Number(i)).toBeCloseTo(0.8);
  const json = await leerJSON(page);
  expect(json.marco).toBe('ex');
  expect(json.holo).toBe(true);
  expect(json.holoIntensidad).toBeCloseTo(0.8);
  expect(json.sello).toMatchObject({ texto: 'EX', estilo: 'arcoiris' });
});

test('"ur" sigue funcionando como sinónimo de EX', async ({ page }) => {
  await page.goto('creador-cartas.html');
  const r = await page.evaluate(() => { const c = window.CartaCapas.desdeRareza('ur', 'x.webp'); return [c.marco, c.sello.texto, c.holo]; });
  expect(r).toEqual(['ex', 'EX', true]);
});

test('en el celular no hay scroll horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('creador-cartas.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('la demo del juego carga sin errores', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('ejemplo.html');
  await expect(page.locator('.cc-card').first()).toBeVisible();
  expect(errores).toEqual([]);
});
