<!--
  Envoltorio de Vue 3 para carta-capas.js

    <CartaCapas ref="carta" :carta="yuki" :holo="esHolo" style="width:330px" />

    this.$refs.carta.ocultarSello()   // en la apertura, antes de voltear
    this.$refs.carta.entrar()         // al revelar

  Copia carta-capas.js junto a este archivo (o ajusta la ruta del import).
  Solo se ejecuta en el navegador, así que funciona con Nuxt / SSR.
-->
<template>
  <div ref="caja" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  carta: { type: Object, required: true },
  holo: { type: Boolean, default: false },
  selloOculto: { type: Boolean, default: false },
});

const caja = ref(null);
let inst = null;
let vivo = true;

async function montar() {
  const mod = await import('./carta-capas.js');
  const lib = mod && mod.default && mod.default.montar ? mod.default : window.CartaCapas;
  if (!vivo || !caja.value || !lib) return;
  if (inst) inst.destruir();
  inst = lib.montar(caja.value, { ...props.carta, holo: props.holo });
  if (props.selloOculto) inst.ocultarSello();
}

onMounted(montar);
onBeforeUnmount(() => {
  vivo = false;
  if (inst) inst.destruir();
  inst = null;
});

watch(() => props.carta, montar);
watch(() => props.holo, (v) => inst && inst.set({ holo: v }));

defineExpose({
  entrar: () => inst && inst.entrar(),
  ocultarSello: () => inst && inst.ocultarSello(),
  set: (cambios) => inst && inst.set(cambios),
  habilitarGiroscopio: () => (inst ? inst.habilitarGiroscopio() : Promise.resolve(false)),
});
</script>
