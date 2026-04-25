import { useEffect, useState } from "react";

const MOBILE_MAX = "(max-width: 767px)";
const DESKTOP_MIN = "(min-width: 1024px)";

function compute() {
  if (typeof window === "undefined") {
    return { isMobile: false, isTablet: false, isDesktop: true };
  }
  const isMobile = window.matchMedia(MOBILE_MAX).matches;
  const isDesktop = window.matchMedia(DESKTOP_MIN).matches;
  return {
    isMobile,
    isDesktop,
    isTablet: !isMobile && !isDesktop,
  };
}

/**
 * Tailwind-aligned breakpoints: mobile &lt;768, tablet 768–1023, desktop ≥1024.
 */
export function useIsMobile() {
  const [state, setState] = useState(compute);

  useEffect(() => {
    const m1 = window.matchMedia(MOBILE_MAX);
    const m2 = window.matchMedia(DESKTOP_MIN);
    const onChange = () => {
      setState(compute());
    };
    m1.addEventListener("change", onChange);
    m2.addEventListener("change", onChange);
    return () => {
      m1.removeEventListener("change", onChange);
      m2.removeEventListener("change", onChange);
    };
  }, []);

  return state;
}
