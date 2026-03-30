/** Intro simples (logo + barra): curta o suficiente para não irritar, longa o suficiente para perceber a marca. */
export const INTRO_SIMPLE_MS = 2200
export const INTRO_SIMPLE_REDUCED_MS = 280

export function getSimpleIntroDurationMs(reduceMotion: boolean): number {
  return reduceMotion ? INTRO_SIMPLE_REDUCED_MS : INTRO_SIMPLE_MS
}

/**
 * Tempos alinhados à intro em `vapour-text-effect` + `VaporizeTextCycle`:
 * 2 palavras com crossfade → na segunda entra direto em scatter; wipe sai em paralelo.
 *
 * A entrada (slide) corre em paralelo ao vapor — o gargalo é o vapor da 1.ª palavra + wipe.
 */
export const INTRO_VAPOR_FIRST_WORD_MS = 1750
/** WAAPI de saída + margem para rAF / `finished`. */
export const INTRO_EXIT_WIPE_MS = 380
export const INTRO_EXIT_BUFFER_MS = 90
/** Margem para `allVaporized` / frames antes do scatter. */
export const INTRO_VAPOR_TAIL_MS = 120

/** Do início útil da intro até ~fim do wipe (sem contar download do chunk). */
export function getVapourIntroTimelineMs(reduceMotion: boolean): number {
  if (reduceMotion) return 180
  return (
    INTRO_VAPOR_FIRST_WORD_MS +
    INTRO_VAPOR_TAIL_MS +
    INTRO_EXIT_WIPE_MS +
    INTRO_EXIT_BUFFER_MS
  )
}
