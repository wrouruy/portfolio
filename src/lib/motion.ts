export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function shouldSkipHeavyMotion() {
  return prefersReducedMotion() || isTouchDevice();
}

export function scrollToSection(hash: string) {
  const target = hash === "#top" ? 0 : hash;
  const lenis = typeof window !== "undefined" ? window.__lenis : undefined;

  if (lenis) {
    lenis.scrollTo(target as never, {
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    return;
  }

  if (target === 0) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
}
