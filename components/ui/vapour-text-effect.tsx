"use client";

import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  createElement,
  useMemo,
  useCallback,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { Inter } from "next/font/google";

import {
  IntroTimedProgressBar,
  type IntroTimedProgressBarHandle,
} from "@/components/ui/intro-timed-progress-bar";
import { getVapourIntroTimelineMs } from "@/lib/intro-progress-timing";

const introFont = Inter({
  subsets: ["latin"],
  display: "swap",
});

/** Igual a `scatterDuration` da intro. */
const INTRO_SCATTER_DURATION_SEC = 1.35;

const INTRO_ENTER_MS = 320;
/**
 * Duração do wipe enquanto o scatter ainda roda (camada inteira leva o canvas — slide e partículas ao mesmo tempo).
 */
const INTRO_EXIT_MS = 380;
/**
 * 0 = `setTimeout(0)` logo após `onScatterPhaseStart` — a saída sobrepõe o efeito das partículas, não espera o fim delas.
 */
const INTRO_WIPE_OUT_DELAY_MS = 0;

const INTRO_ENTER_EASE = "cubic-bezier(0.14, 1, 0.32, 1)";
const INTRO_EXIT_EASE = "cubic-bezier(0.78, 0, 0.94, 0.32)";

function VapourIntroInner({
  onSequenceComplete,
  className,
}: {
  onSequenceComplete?: () => void;
  className?: string;
}) {
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const motionLayerRef = useRef<HTMLDivElement | null>(null);
  const exitStartedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const exitSafetyRef = useRef<number | null>(null);
  const exitAnimRef = useRef<Animation | null>(null);
  const enterAnimRef = useRef<Animation | null>(null);
  const completeRef = useRef(onSequenceComplete);
  const finishOnceRef = useRef(false);
  const introProgressBarRef = useRef<IntroTimedProgressBarHandle>(null);

  useEffect(() => {
    completeRef.current = onSequenceComplete;
  }, [onSequenceComplete]);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current != null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearExitTimer(), [clearExitTimer]);

  const clearExitSafety = useCallback(() => {
    if (exitSafetyRef.current != null) {
      clearTimeout(exitSafetyRef.current);
      exitSafetyRef.current = null;
    }
  }, []);

  const finishIntro = useCallback(() => {
    if (finishOnceRef.current) return;
    finishOnceRef.current = true;
    introProgressBarRef.current?.complete();
    clearExitSafety();
    exitAnimRef.current?.cancel();
    exitAnimRef.current = null;
    completeRef.current?.();
  }, [clearExitSafety]);

  useEffect(
    () => () => {
      enterAnimRef.current?.cancel();
      enterAnimRef.current = null;
      exitAnimRef.current?.cancel();
      exitAnimRef.current = null;
      clearExitSafety();
    },
    [clearExitSafety],
  );

  /** Entrada só WAAPI (igual à saída): evita misturar `transition` CSS com `element.animate` → menos piscada na saída. */
  useLayoutEffect(() => {
    const el = motionLayerRef.current;
    if (!el) return;

    if (reduceMotion) {
      enterAnimRef.current?.cancel();
      enterAnimRef.current = null;
      el.style.transition = "none";
      el.style.transform = "translate3d(0, 0, 0)";
      el.style.opacity = "1";
      return;
    }

    el.style.opacity = "1";
    el.style.transition = "none";

    enterAnimRef.current?.cancel();
    const anim = el.animate(
      [
        { transform: "translate3d(100%, 0, 0)" },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: INTRO_ENTER_MS,
        easing: INTRO_ENTER_EASE,
        fill: "forwards",
        composite: "replace",
      },
    );
    enterAnimRef.current = anim;

    return () => {
      enterAnimRef.current?.cancel();
      enterAnimRef.current = null;
    };
  }, [reduceMotion]);

  const runExitSlide = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    if (reduceMotion) {
      window.setTimeout(finishIntro, 140);
      return;
    }

    const node = motionLayerRef.current;
    if (!node) {
      finishIntro();
      return;
    }

    node.style.opacity = "1";
    node.style.transition = "none";

    /** Grava o estado atual no `style` antes de cancelar a entrada — evita salto/piscada (também se ainda estiver em curso). */
    const enter = enterAnimRef.current;
    if (enter) {
      let stylesCommitted = false;
      try {
        if (enter.playState === "finished") {
          enter.commitStyles();
          stylesCommitted = true;
        }
      } catch {
        stylesCommitted = false;
      }
      if (!stylesCommitted) {
        const t = getComputedStyle(node).transform;
        if (t && t !== "none") {
          node.style.transform = t;
        }
      }
      try {
        enter.cancel();
      } catch {
        /* ignore */
      }
      enterAnimRef.current = null;
    }

    /** Um frame após handoff entrada→inline: evita 1 composição “a meio” entre cancel e nova animação. */
    requestAnimationFrame(() => {
      const layer = motionLayerRef.current;
      if (!layer) {
        if (!finishOnceRef.current) finishIntro();
        return;
      }
      if (finishOnceRef.current) return;

      exitAnimRef.current?.cancel();
      const anim = layer.animate(
        [{}, { transform: "translate3d(-100%, 0, 0)" }],
        {
          duration: INTRO_EXIT_MS,
          easing: INTRO_EXIT_EASE,
          fill: "forwards",
          composite: "replace",
        },
      );
      exitAnimRef.current = anim;

      clearExitSafety();
      exitSafetyRef.current = window.setTimeout(finishIntro, INTRO_EXIT_MS + 250);

      anim.finished
        .then(() => {
          exitAnimRef.current = null;
          if (!finishOnceRef.current) finishIntro();
        })
        .catch(() => {
          exitAnimRef.current = null;
        });
    });
  }, [reduceMotion, finishIntro, clearExitSafety]);

  const handleScatterPhaseStart = useCallback(() => {
    clearExitTimer();
    const delay = reduceMotion ? 0 : INTRO_WIPE_OUT_DELAY_MS;
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      runExitSlide();
    }, delay);
  }, [clearExitTimer, reduceMotion, runExitSlide]);

  return (
    <div
      className={`fixed inset-0 z-[9999] isolate overflow-hidden bg-black ${className ?? ""}`}
      role="presentation"
    >
      <div ref={motionLayerRef} className="fifth-intro-panel pointer-events-none absolute inset-0">
        <div
          className={`${introFont.className} relative h-full min-h-[100dvh] w-full overflow-hidden`}
        >
          <div className="absolute inset-0 h-full min-h-[100dvh] w-full">
            <VaporizeTextCycle
              wrapperClassName="min-h-full w-full"
              texts={["FIFTH TECH", "FIFTH TASK"]}
              font={{
                fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif',
                fontSize: "84px",
                fontWeight: 700,
              }}
              color="rgb(255,255,255)"
              spread={5}
              density={5}
              animation={{
                vaporizeDuration: 1.75,
                overlapStartPercent: 44,
                scatterDuration: INTRO_SCATTER_DURATION_SEC,
                fadeInDuration: 1,
                waitDuration: 0,
              }}
              crossfadeWords
              finalParticleScatter
              deferSequenceComplete
              onScatterPhaseStart={handleScatterPhaseStart}
              direction="left-to-right"
              alignment="center"
              tag={Tag.H1}
              singleLoop
              alwaysInView
              onSequenceComplete={onSequenceComplete}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-[min(58%,calc(50%+5.5rem))] z-10 flex justify-center px-6">
            <IntroTimedProgressBar
              ref={introProgressBarRef}
              capUntilComplete
              durationMs={getVapourIntroTimelineMs(reduceMotion)}
              className="max-w-[220px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const VapourIntro = ({
  onSequenceComplete,
  className,
}: {
  onSequenceComplete?: () => void;
  className?: string;
}) => {
  /**
   * Só “FIFTH TECH” vaporiza (com crossfade para “FIFTH TASK”). Sem segunda saída em vapor: as partículas dispersam;
   * Wipe de saída dispara no início do scatter (sobreposto às partículas). `onSequenceComplete` no fim do wipe.
   */
  const content = (
    <VapourIntroInner onSequenceComplete={onSequenceComplete} className={className} />
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
};

export enum Tag {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  P = "p",
}

type VaporizeTextCycleProps = {
  texts: string[];
  font?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number;
  };
  color?: string;
  spread?: number;
  density?: number;
  animation?: {
    vaporizeDuration?: number;
    /** Só na última palavra (`singleLoop`): vapor mais curto — evita parecer que o texto “repete” outra animação longa. */
    lastVaporizeDuration?: number;
    fadeInDuration?: number;
    waitDuration?: number;
    /** Quando `crossfadeWords`: % do vapor a partir do qual a próxima palavra começa a surgir (0–99). */
    overlapStartPercent?: number;
    /** Duração (s) da fase `finalParticleScatter` em que as partículas se espalham pela tela. */
    scatterDuration?: number;
  };
  /**
   * Próxima palavra aparece por cima enquanto a atual vaporiza: revelação em “wipe” no mesmo sentido de `direction`
   * (ex.: LTR = segunda surge da esquerda para a direita, alinhada ao vapor da primeira).
   * Na última palavra com `singleLoop`, o crossfade é desligado.
   */
  crossfadeWords?: boolean;
  /**
   * Com `singleLoop` e pelo menos 2 textos: após o crossfade para a última palavra, não há vapor de saída —
   * as partículas dispersam pela tela até `onSequenceComplete`.
   */
  finalParticleScatter?: boolean;
  direction?: "left-to-right" | "right-to-left";
  alignment?: "left" | "center" | "right";
  tag?: Tag;
  /** When true, stops after one full pass through `texts` (after the last line vaporizes). */
  singleLoop?: boolean;
  /** Fires once when `singleLoop` finishes (after the last text’s vaporize completes). */
  onSequenceComplete?: () => void;
  /** Skip IntersectionObserver — use for full-screen intros where IO can stay false (e.g. overlays). */
  alwaysInView?: boolean;
  /** Classes no wrapper do canvas (ex.: min-h-full para preencher o viewport). */
  wrapperClassName?: string;
  /** Dispara quando a fase de dispersão final começa (ex.: para wipe do painel antes do fim das partículas). */
  onScatterPhaseStart?: () => void;
  /**
   * Com `finalParticleScatter`: ao fim de `scatterDuration` só entra em `complete` e não chama `onSequenceComplete`
   * (quem completa é o painel / pai, p.ex. após animação de saída).
   */
  deferSequenceComplete?: boolean;
};

type Particle = {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  color: string;
  opacity: number;
  originalAlpha: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  shouldFadeQuickly?: boolean;
};

type TextBoundaries = {
  left: number;
  right: number;
  width: number;
};

declare global {
  interface HTMLCanvasElement {
    textBoundaries?: TextBoundaries;
  }
}

/** Canvas 2D ignora `var(--*)`; sem isso o browser usa fonte minúscula (~10px). */
function sanitizeFontFamilyForCanvas(fontFamily: string | undefined): string {
  const f = (fontFamily ?? "").trim();
  if (!f || f.includes("var(")) {
    return 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
  return f;
}

function parseFontSizePx(fontSize: string | undefined, fallback: number): number {
  if (!fontSize) return fallback;
  const n = parseInt(String(fontSize).replace(/px/gi, "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function VaporizeTextCycle({
  texts = ["Next.js", "React"],
  font = {
    fontFamily: "sans-serif",
    fontSize: "50px",
    fontWeight: 400,
  },
  color = "rgb(255, 255, 255)",
  spread = 5,
  density = 5,
  animation = {
    vaporizeDuration: 2,
    fadeInDuration: 1,
    waitDuration: 0.5,
  },
  direction = "left-to-right",
  alignment = "center",
  tag = Tag.P,
  singleLoop = false,
  crossfadeWords = false,
  finalParticleScatter = false,
  alwaysInView = false,
  wrapperClassName = "",
  onSequenceComplete,
  onScatterPhaseStart,
  deferSequenceComplete = false,
}: VaporizeTextCycleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isInView = useIsInView(wrapperRef as React.RefObject<HTMLElement>, alwaysInView);
  const lastFontRef = useRef<string | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particlesIncomingRef = useRef<Particle[]>([]);
  const incomingSpawnedRef = useRef(false);
  const pendingNextIndexRef = useRef(0);
  const incomingBoundariesRef = useRef<TextBoundaries | null>(null);
  /** Evita `renderCanvas` no `useEffect` logo após handoff — reamostragem apagava o estado e a 2ª palavra não vaporizava. */
  const skipIndexDrivenResampleRef = useRef(false);
  const scatterInitRef = useRef(false);
  const scatterTimeRef = useRef(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const currentTextIndexRef = useRef(0);
  const sequenceDoneRef = useRef(false);
  const onSequenceCompleteRef = useRef(onSequenceComplete);
  useEffect(() => {
    onSequenceCompleteRef.current = onSequenceComplete;
  }, [onSequenceComplete]);
  const onScatterPhaseStartRef = useRef(onScatterPhaseStart);
  useEffect(() => {
    onScatterPhaseStartRef.current = onScatterPhaseStart;
  }, [onScatterPhaseStart]);
  const deferSequenceCompleteRef = useRef(deferSequenceComplete);
  useEffect(() => {
    deferSequenceCompleteRef.current = deferSequenceComplete;
  }, [deferSequenceComplete]);
  const [animationState, setAnimationState] = useState<
    "static" | "vaporizing" | "fadingIn" | "waiting" | "scattering" | "complete"
  >("static");
  const vaporizeProgressRef = useRef(0);
  const fadeOpacityRef = useRef(0);
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });
  const transformedDensity = transformValue(density, [0, 10], [0.3, 1], true);

  useEffect(() => {
    currentTextIndexRef.current = currentTextIndex;
  }, [currentTextIndex]);

  /** Limite evita buffer enorme; texto continua nítido com font em px * dpr */
  const globalDpr = useMemo(() => {
    if (typeof window !== "undefined") {
      return Math.min(window.devicePixelRatio || 1, 2.5);
    }
    return 1;
  }, []);

  const wrapperStyle = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      pointerEvents: "none" as const,
    }),
    [],
  );

  const canvasStyle = useMemo(
    () => ({
      minWidth: "30px",
      minHeight: "20px",
      pointerEvents: "none" as const,
    }),
    [],
  );

  const animationDurations = useMemo(
    () => ({
      VAPORIZE_DURATION: (animation.vaporizeDuration ?? 2) * 1000,
      FADE_IN_DURATION: (animation.fadeInDuration ?? 1) * 1000,
      WAIT_DURATION: (animation.waitDuration ?? 0.5) * 1000,
    }),
    [animation.vaporizeDuration, animation.fadeInDuration, animation.waitDuration],
  );

  const fontConfig = useMemo(() => {
    const fontSize = parseFontSizePx(font.fontSize, 50);
    const VAPORIZE_SPREAD = calculateVaporizeSpread(fontSize);
    const MULTIPLIED_VAPORIZE_SPREAD = VAPORIZE_SPREAD * spread;
    return {
      fontSize,
      VAPORIZE_SPREAD,
      MULTIPLIED_VAPORIZE_SPREAD,
      font: `${font.fontWeight ?? 400} ${fontSize * globalDpr}px ${sanitizeFontFamilyForCanvas(font.fontFamily)}`,
    };
  }, [font.fontSize, font.fontWeight, font.fontFamily, spread, globalDpr]);

  const memoizedRenderParticles = useCallback(
    (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
      renderParticles(ctx, particles, globalDpr);
    },
    [globalDpr],
  );

  useEffect(() => {
    if (isInView) {
      const startAnimationTimeout = setTimeout(() => {
        setAnimationState("vaporizing");
      }, 0);
      return () => clearTimeout(startAnimationTimeout);
    }
    const resetId = setTimeout(() => {
      setAnimationState("static");
      sequenceDoneRef.current = false;
      incomingSpawnedRef.current = false;
      particlesIncomingRef.current = [];
      incomingBoundariesRef.current = null;
      scatterInitRef.current = false;
      scatterTimeRef.current = 0;
    }, 0);
    return () => clearTimeout(resetId);
  }, [isInView]);

  useEffect(() => {
    if (!isInView) return;

    let lastTime = performance.now();
    let frameId: number;

    const animate = (currentTime: number) => {
      if (sequenceDoneRef.current) {
        return;
      }

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx || !particlesRef.current.length) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      switch (animationState) {
        case "static": {
          memoizedRenderParticles(ctx, particlesRef.current);
          break;
        }
        case "vaporizing": {
          const idx = currentTextIndexRef.current;
          const last = texts.length > 0 ? texts.length - 1 : 0;
          const isLastInLoop = singleLoop && idx === last;
          const effectiveVaporMs =
            !finalParticleScatter &&
            isLastInLoop &&
            typeof animation.lastVaporizeDuration === "number"
              ? animation.lastVaporizeDuration * 1000
              : animationDurations.VAPORIZE_DURATION;

          vaporizeProgressRef.current +=
            (deltaTime * 100) / (effectiveVaporMs / 1000);

          const textBoundaries = canvas.textBoundaries;
          if (!textBoundaries) break;

          const progress = Math.min(100, vaporizeProgressRef.current);
          const vaporizeX =
            progress >= 100
              ? direction === "left-to-right"
                ? canvas.width * 2
                : -canvas.width * 2
              : direction === "left-to-right"
                ? textBoundaries.left + (textBoundaries.width * progress) / 100
                : textBoundaries.right - (textBoundaries.width * progress) / 100;

          const allVaporized = updateParticles(
            particlesRef.current,
            vaporizeX,
            deltaTime,
            fontConfig.MULTIPLIED_VAPORIZE_SPREAD,
            effectiveVaporMs,
            direction,
            transformedDensity,
          );
          memoizedRenderParticles(ctx, particlesRef.current);

          const useCross = crossfadeWords && texts.length > 1 && !isLastInLoop;
          const overlapStart = Math.min(90, Math.max(8, animation.overlapStartPercent ?? 38));

          if (
            useCross &&
            !incomingSpawnedRef.current &&
            vaporizeProgressRef.current >= overlapStart
          ) {
            const nextIdx = (idx + 1) % texts.length;
            const { particles: inc, textBoundaries: tb } = sampleWordParticlesInto(
              wrapperSize.width,
              wrapperSize.height,
              globalDpr,
              { texts, font, color, alignment },
              nextIdx,
            );
            if (inc.length > 0) {
              pendingNextIndexRef.current = nextIdx;
              particlesIncomingRef.current = inc;
              incomingBoundariesRef.current = tb;
              incomingSpawnedRef.current = true;
            }
          }

          if (
            useCross &&
            incomingSpawnedRef.current &&
            particlesIncomingRef.current.length > 0 &&
            incomingBoundariesRef.current
          ) {
            renderIncomingCrossfadeReveal(
              ctx,
              particlesIncomingRef.current,
              globalDpr,
              incomingBoundariesRef.current,
              progress,
              overlapStart,
              direction,
            );
          }

          if (vaporizeProgressRef.current >= 100 && allVaporized) {
            if (
              singleLoop &&
              idx === last &&
              !sequenceDoneRef.current &&
              !finalParticleScatter
            ) {
              sequenceDoneRef.current = true;
              setAnimationState("complete");
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  onSequenceCompleteRef.current?.();
                });
              });
              return;
            }
            if (
              finalParticleScatter &&
              singleLoop &&
              idx === last &&
              !sequenceDoneRef.current
            ) {
              scatterInitRef.current = false;
              scatterTimeRef.current = 0;
              onScatterPhaseStartRef.current?.();
              setAnimationState("scattering");
              break;
            }
            if (useCross && incomingSpawnedRef.current && particlesIncomingRef.current.length > 0) {
              if (incomingBoundariesRef.current) {
                canvas.textBoundaries = incomingBoundariesRef.current;
              }
              particlesRef.current = particlesIncomingRef.current;
              particlesIncomingRef.current = [];
              incomingSpawnedRef.current = false;
              incomingBoundariesRef.current = null;
              const next = pendingNextIndexRef.current;
              currentTextIndexRef.current = next;
              skipIndexDrivenResampleRef.current = true;
              setCurrentTextIndex(next);
              vaporizeProgressRef.current = 0;
              resetParticles(particlesRef.current);
              if (finalParticleScatter && singleLoop && next === last) {
                scatterInitRef.current = false;
                scatterTimeRef.current = 0;
                onScatterPhaseStartRef.current?.();
                setAnimationState("scattering");
              }
              break;
            }
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
            setAnimationState("fadingIn");
            fadeOpacityRef.current = 0;
          }
          break;
        }
        case "fadingIn": {
          fadeOpacityRef.current +=
            (deltaTime * 1000) / animationDurations.FADE_IN_DURATION;

          ctx.save();
          ctx.scale(globalDpr, globalDpr);
          particlesRef.current.forEach((particle) => {
            particle.x = particle.originalX;
            particle.y = particle.originalY;
            const opacity = Math.min(fadeOpacityRef.current, 1) * particle.originalAlpha;
            const color = particle.color.replace(/[\d.]+\)$/, `${opacity})`);
            ctx.fillStyle = color;
            ctx.fillRect(particle.x / globalDpr, particle.y / globalDpr, 1, 1);
          });
          ctx.restore();

          if (fadeOpacityRef.current >= 1) {
            setAnimationState("waiting");
            setTimeout(() => {
              setAnimationState("vaporizing");
              vaporizeProgressRef.current = 0;
              resetParticles(particlesRef.current);
            }, animationDurations.WAIT_DURATION);
          }
          break;
        }
        case "waiting": {
          memoizedRenderParticles(ctx, particlesRef.current);
          break;
        }
        case "scattering": {
          const scatterSecs = animation.scatterDuration ?? 1.25;
          const boost = 420 * globalDpr;

          if (!scatterInitRef.current) {
            scatterInitRef.current = true;
            scatterTimeRef.current = 0;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            particlesRef.current.forEach((p) => {
              const dx = p.originalX - cx;
              const dy = p.originalY - cy;
              const base = Math.atan2(dy, dx);
              const ang = base + (Math.random() - 0.5) * 1.1;
              const mag = 0.55 + Math.random() * 1.05;
              p.velocityX = Math.cos(ang) * mag * boost;
              p.velocityY = Math.sin(ang) * mag * boost;
              p.speed = 1;
            });
          }

          scatterTimeRef.current += deltaTime;

          particlesRef.current.forEach((p) => {
            p.x += p.velocityX * deltaTime;
            p.y += p.velocityY * deltaTime;
            p.velocityX *= 1 + deltaTime * 0.2;
            p.velocityY *= 1 + deltaTime * 0.2;
            p.opacity = Math.max(0, p.opacity - deltaTime * 0.42);
          });

          memoizedRenderParticles(ctx, particlesRef.current);

          if (scatterTimeRef.current >= scatterSecs && !sequenceDoneRef.current) {
            sequenceDoneRef.current = true;
            setAnimationState("complete");
            if (!deferSequenceCompleteRef.current) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  onSequenceCompleteRef.current?.();
                });
              });
            }
            return;
          }
          break;
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [
    animationState,
    isInView,
    texts.length,
    direction,
    globalDpr,
    memoizedRenderParticles,
    animationDurations.FADE_IN_DURATION,
    animationDurations.WAIT_DURATION,
    animationDurations.VAPORIZE_DURATION,
    animation.overlapStartPercent,
    animation.lastVaporizeDuration,
    animation.scatterDuration,
    fontConfig.MULTIPLIED_VAPORIZE_SPREAD,
    transformedDensity,
    singleLoop,
    crossfadeWords,
    finalParticleScatter,
    texts,
    font,
    color,
    alignment,
    wrapperSize.width,
    wrapperSize.height,
  ]);

  useEffect(() => {
    if (skipIndexDrivenResampleRef.current) {
      skipIndexDrivenResampleRef.current = false;
      return undefined;
    }

    renderCanvas({
      framerProps: {
        texts,
        font,
        color,
        alignment,
      },
      canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
      wrapperSize,
      particlesRef,
      globalDpr,
      currentTextIndex,
    });

    const currentFont = font.fontFamily || "sans-serif";
    return handleFontChange({
      currentFont,
      lastFontRef,
      canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
      wrapperSize,
      particlesRef,
      globalDpr,
      currentTextIndex,
      framerProps: {
        texts,
        font,
        color,
        alignment,
      },
    });
  }, [texts, font, color, alignment, wrapperSize, currentTextIndex, globalDpr]);

  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setWrapperSize({ width, height });
      }

      renderCanvas({
        framerProps: {
          texts,
          font,
          color,
          alignment,
        },
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
        wrapperSize: { width: container.clientWidth, height: container.clientHeight },
        particlesRef,
        globalDpr,
        currentTextIndex,
      });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [texts, font, color, alignment, globalDpr, currentTextIndex]);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : typeof window !== "undefined" ? window.innerWidth : 0;
    const height =
      rect.height > 0 ? rect.height : typeof window !== "undefined" ? window.innerHeight : 0;
    if (width > 0 && height > 0) {
      const id = window.setTimeout(() => {
        setWrapperSize({ width, height });
      }, 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, []);

  return (
    <div ref={wrapperRef} style={wrapperStyle} className={wrapperClassName}>
      <canvas ref={canvasRef} style={canvasStyle} />
      <SeoElement tag={tag} texts={texts} />
    </div>
  );
}

const SeoElement = memo(function SeoElementInner({
  tag = Tag.P,
  texts,
}: {
  tag: Tag;
  texts: string[];
}) {
  const style = useMemo(
    () => ({
      position: "absolute" as const,
      width: "0",
      height: "0",
      overflow: "hidden",
      userSelect: "none" as const,
      pointerEvents: "none" as const,
    }),
    [],
  );

  const safeTag = Object.values(Tag).includes(tag) ? tag : "p";

  return createElement(safeTag, { style }, texts?.join(" ") ?? "");
});

const handleFontChange = ({
  currentFont,
  lastFontRef,
  canvasRef,
  wrapperSize,
  particlesRef,
  globalDpr,
  currentTextIndex,
  framerProps,
}: {
  currentFont: string;
  lastFontRef: React.MutableRefObject<string | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  wrapperSize: { width: number; height: number };
  particlesRef: React.MutableRefObject<Particle[]>;
  globalDpr: number;
  currentTextIndex: number;
  framerProps: VaporizeTextCycleProps;
}) => {
  if (currentFont !== lastFontRef.current) {
    lastFontRef.current = currentFont;

    const timeoutId = setTimeout(() => {
      cleanup({ canvasRef, particlesRef });
      renderCanvas({
        framerProps,
        canvasRef,
        wrapperSize,
        particlesRef,
        globalDpr,
        currentTextIndex,
      });
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      cleanup({ canvasRef, particlesRef });
    };
  }

  return undefined;
};

const cleanup = ({
  canvasRef,
  particlesRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  particlesRef: React.MutableRefObject<Particle[]>;
}) => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext("2d");

  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (particlesRef.current) {
    particlesRef.current = [];
  }
};

const renderCanvas = ({
  framerProps,
  canvasRef,
  wrapperSize,
  particlesRef,
  globalDpr,
  currentTextIndex,
}: {
  framerProps: VaporizeTextCycleProps;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  wrapperSize: { width: number; height: number };
  particlesRef: React.MutableRefObject<Particle[]>;
  globalDpr: number;
  currentTextIndex: number;
}) => {
  const canvas = canvasRef.current;
  if (!canvas || !wrapperSize.width || !wrapperSize.height) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = wrapperSize;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * globalDpr);
  canvas.height = Math.floor(height * globalDpr);

  const fontSize = parseFontSizePx(framerProps.font?.fontSize, 50);
  const font = `${framerProps.font?.fontWeight ?? 400} ${fontSize * globalDpr}px ${sanitizeFontFamilyForCanvas(framerProps.font?.fontFamily)}`;
  const color = parseColor(framerProps.color ?? "rgb(153, 153, 153)");

  let textX;
  const textY = canvas.height / 2;
  const currentText = framerProps.texts[currentTextIndex] || "Next.js";

  if (framerProps.alignment === "center") {
    textX = canvas.width / 2;
  } else if (framerProps.alignment === "left") {
    textX = 0;
  } else {
    textX = canvas.width;
  }

  const { particles, textBoundaries } = createParticles(
    ctx,
    canvas,
    currentText,
    textX,
    textY,
    font,
    color,
    framerProps.alignment || "left",
  );

  particlesRef.current = particles;
  canvas.textBoundaries = textBoundaries;
};

const createParticles = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  textX: number,
  textY: number,
  font: string,
  color: string,
  alignment: "left" | "center" | "right",
) => {
  const particles: Particle[] = [];

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = alignment;
  ctx.textBaseline = "middle";
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = true;

  if ("fontKerning" in ctx) {
    (ctx as CanvasRenderingContext2D & { fontKerning?: string }).fontKerning = "normal";
  }

  if ("textRendering" in ctx) {
    (ctx as CanvasRenderingContext2D & { textRendering?: string }).textRendering =
      "geometricPrecision";
  }

  const metrics = ctx.measureText(text);
  let textLeft;
  const textWidth = metrics.width;

  if (alignment === "center") {
    textLeft = textX - textWidth / 2;
  } else if (alignment === "left") {
    textLeft = textX;
  } else {
    textLeft = textX - textWidth;
  }

  const textBoundaries = {
    left: textLeft,
    right: textLeft + textWidth,
    width: textWidth,
  };

  ctx.fillText(text, textX, textY);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const baseDPR = 3;
  const currentDPR = canvas.width / parseInt(canvas.style.width, 10);
  const baseSampleRate = Math.max(1, Math.round(currentDPR / baseDPR));
  const sampleRate = Math.max(1, Math.round(baseSampleRate));

  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];

      if (alpha > 0) {
        const originalAlpha = (alpha / 255) * (sampleRate / currentDPR);
        const particle = {
          x,
          y,
          originalX: x,
          originalY: y,
          color: `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${originalAlpha})`,
          opacity: originalAlpha,
          originalAlpha,
          velocityX: 0,
          velocityY: 0,
          angle: 0,
          speed: 0,
        };

        particles.push(particle);
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  return { particles, textBoundaries };
};

type FramerSampleProps = Pick<VaporizeTextCycleProps, "texts" | "font" | "color" | "alignment">;

function sampleWordParticlesInto(
  wrapperWidth: number,
  wrapperHeight: number,
  globalDpr: number,
  framerProps: FramerSampleProps,
  textIndex: number,
): { particles: Particle[]; textBoundaries: TextBoundaries } {
  const w = Math.floor(wrapperWidth * globalDpr);
  const h = Math.floor(wrapperHeight * globalDpr);
  if (w < 1 || h < 1) {
    return { particles: [], textBoundaries: { left: 0, right: 0, width: 0 } };
  }
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  off.style.width = `${wrapperWidth}px`;
  off.style.height = `${wrapperHeight}px`;
  const octx = off.getContext("2d");
  if (!octx) {
    return { particles: [], textBoundaries: { left: 0, right: 0, width: 0 } };
  }
  const fontSize = parseFontSizePx(framerProps.font?.fontSize, 50);
  const fontStr = `${framerProps.font?.fontWeight ?? 400} ${fontSize * globalDpr}px ${sanitizeFontFamilyForCanvas(framerProps.font?.fontFamily)}`;
  const color = parseColor(framerProps.color ?? "rgb(255, 255, 255)");
  const line = framerProps.texts[textIndex] ?? "";
  const alignment = framerProps.alignment || "left";
  let textX: number;
  const textY = h / 2;
  if (alignment === "center") textX = w / 2;
  else if (alignment === "left") textX = 0;
  else textX = w;
  return createParticles(octx, off, line, textX, textY, fontStr, color, alignment);
}

/** Segunda palavra no crossfade: revela no mesmo sentido do vapor (LTR = borda da esquerda → direita). */
function renderIncomingCrossfadeReveal(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  globalDpr: number,
  tb: TextBoundaries,
  vaporProgressPct: number,
  overlapStart: number,
  direction: "left-to-right" | "right-to-left",
) {
  if (particles.length === 0 || tb.width <= 0) return;

  const localT =
    vaporProgressPct <= overlapStart
      ? 0
      : (vaporProgressPct - overlapStart) / Math.max(1e-6, 100 - overlapStart);

  const feather = Math.max(4, 6 * globalDpr);

  ctx.save();
  ctx.scale(globalDpr, globalDpr);

  if (direction === "left-to-right") {
    const revealEdge = tb.left + tb.width * localT;
    particles.forEach((p) => {
      if (p.opacity <= 0) return;
      const depth = revealEdge - p.originalX;
      let m = 1;
      if (depth < 0) m = 0;
      else if (depth < feather) m = depth / feather;
      if (m < 0.002) return;
      const o = Math.min(1, p.opacity * m);
      const color = p.color.replace(/[\d.]+\)$/, `${o})`);
      ctx.fillStyle = color;
      ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1, 1);
    });
  } else {
    const boundary = tb.right - tb.width * (1 - localT);
    particles.forEach((p) => {
      if (p.opacity <= 0) return;
      const depth = p.originalX - boundary;
      let m = 1;
      if (depth < 0) m = 0;
      else if (depth < feather) m = depth / feather;
      if (m < 0.002) return;
      const o = Math.min(1, p.opacity * m);
      const color = p.color.replace(/[\d.]+\)$/, `${o})`);
      ctx.fillStyle = color;
      ctx.fillRect(p.x / globalDpr, p.y / globalDpr, 1, 1);
    });
  }

  ctx.restore();
}

const updateParticles = (
  particles: Particle[],
  vaporizeX: number,
  deltaTime: number,
  MULTIPLIED_VAPORIZE_SPREAD: number,
  VAPORIZE_DURATION: number,
  direction: string,
  density: number,
) => {
  let allParticlesVaporized = true;

  particles.forEach((particle) => {
    const shouldVaporize =
      direction === "left-to-right"
        ? particle.originalX <= vaporizeX
        : particle.originalX >= vaporizeX;

    if (shouldVaporize) {
      if (particle.speed === 0) {
        particle.angle = Math.random() * Math.PI * 2;
        particle.speed = (Math.random() * 1 + 0.5) * MULTIPLIED_VAPORIZE_SPREAD;
        particle.velocityX = Math.cos(particle.angle) * particle.speed;
        particle.velocityY = Math.sin(particle.angle) * particle.speed;

        particle.shouldFadeQuickly = Math.random() > density;
      }

      if (particle.shouldFadeQuickly) {
        particle.opacity = Math.max(0, particle.opacity - deltaTime);
      } else {
        const dx = particle.originalX - particle.x;
        const dy = particle.originalY - particle.y;
        const distanceFromOrigin = Math.sqrt(dx * dx + dy * dy);

        const dampingFactor = Math.max(0.95, 1 - distanceFromOrigin / (100 * MULTIPLIED_VAPORIZE_SPREAD));

        const randomSpread = MULTIPLIED_VAPORIZE_SPREAD * 3;
        const spreadX = (Math.random() - 0.5) * randomSpread;
        const spreadY = (Math.random() - 0.5) * randomSpread;

        particle.velocityX = (particle.velocityX + spreadX + dx * 0.002) * dampingFactor;
        particle.velocityY = (particle.velocityY + spreadY + dy * 0.002) * dampingFactor;

        const maxVelocity = MULTIPLIED_VAPORIZE_SPREAD * 2;
        const currentVelocity = Math.sqrt(
          particle.velocityX * particle.velocityX + particle.velocityY * particle.velocityY,
        );

        if (currentVelocity > maxVelocity) {
          const scale = maxVelocity / currentVelocity;
          particle.velocityX *= scale;
          particle.velocityY *= scale;
        }

        particle.x += particle.velocityX * deltaTime * 20;
        particle.y += particle.velocityY * deltaTime * 10;

        const baseFadeRate = 0.25;
        const durationBasedFadeRate = baseFadeRate * (2000 / VAPORIZE_DURATION);

        particle.opacity = Math.max(0, particle.opacity - deltaTime * durationBasedFadeRate);
      }

      if (particle.opacity > 0.01) {
        allParticlesVaporized = false;
      }
    } else {
      allParticlesVaporized = false;
    }
  });

  return allParticlesVaporized;
};

const renderParticles = (ctx: CanvasRenderingContext2D, particles: Particle[], globalDpr: number) => {
  ctx.save();
  ctx.scale(globalDpr, globalDpr);

  particles.forEach((particle) => {
    if (particle.opacity > 0) {
      const color = particle.color.replace(/[\d.]+\)$/, `${particle.opacity})`);
      ctx.fillStyle = color;
      ctx.fillRect(particle.x / globalDpr, particle.y / globalDpr, 1, 1);
    }
  });

  ctx.restore();
};

const resetParticles = (particles: Particle[]) => {
  particles.forEach((particle) => {
    particle.x = particle.originalX;
    particle.y = particle.originalY;
    particle.opacity = particle.originalAlpha;
    particle.speed = 0;
    particle.velocityX = 0;
    particle.velocityY = 0;
  });
};

const calculateVaporizeSpread = (fontSize: number) => {
  const size = typeof fontSize === "string" ? parseInt(fontSize, 10) : fontSize;

  const points = [
    { size: 20, spread: 0.2 },
    { size: 50, spread: 0.5 },
    { size: 100, spread: 1.5 },
  ];

  if (size <= points[0].size) return points[0].spread;
  if (size >= points[points.length - 1].size) return points[points.length - 1].spread;

  let i = 0;
  while (i < points.length - 1 && points[i + 1].size < size) i++;

  const p1 = points[i];
  const p2 = points[i + 1];

  return p1.spread + ((size - p1.size) * (p2.spread - p1.spread)) / (p2.size - p1.size);
};

const parseColor = (color: string) => {
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);

  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } else if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  console.warn("Could not parse color:", color);
  return "rgba(0, 0, 0, 1)";
};

function transformValue(
  input: number,
  inputRange: number[],
  outputRange: number[],
  clamp = false,
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;

  const progress = (input - inputMin) / (inputMax - inputMin);
  let result = outputMin + progress * (outputMax - outputMin);

  if (clamp) {
    if (outputMax > outputMin) {
      result = Math.min(Math.max(result, outputMin), outputMax);
    } else {
      result = Math.min(Math.max(result, outputMax), outputMin);
    }
  }

  return result;
}

function useIsInView(ref: React.RefObject<HTMLElement | null>, force: boolean) {
  const [isInView, setIsInView] = useState(force);

  useLayoutEffect(() => {
    if (force) {
      return undefined;
    }

    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "50px" },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [ref, force]);

  return isInView;
}
