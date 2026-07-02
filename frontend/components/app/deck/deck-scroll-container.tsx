"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface DeckScrollContainerProps {
  /** Pass children as an array prop so React.Children is unnecessary */
  floors: React.ReactNode[];
  /** Expose current floor index to parent */
  onFloorChange?: (index: number) => void;
}

/**
 * DeckScrollContainer  — cycle-style floor switcher
 *
 * Scroll DOWN  →  active card slides DOWN off-screen
 *                 next card scales up from behind  (scale 0.75 → 1)
 *
 * Scroll UP    →  active card slides UP off-screen
 *                 previous card scales up from behind
 *
 * The "stack peek" renders the next 2 upcoming cards visibly shrinking
 * behind the active card at all times.
 */
export function DeckScrollContainer({
  floors,
  onFloorChange,
}: DeckScrollContainerProps) {
  const total = floors.length;
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1); // 1 = forward/down, -1 = back/up
  const locked = useRef(false);
  const touchY = useRef(0);
  const wheelAcc = useRef(0);

  const go = useCallback(
    (direction: 1 | -1) => {
      if (locked.current) return;
      setCurrent((prev) => {
        const next = prev + direction;
        if (next < 0 || next >= total) return prev;
        setDir(direction);
        locked.current = true;
        setTimeout(() => {
          locked.current = false;
          wheelAcc.current = 0;
        }, 620);
        onFloorChange?.(next);
        return next;
      });
    },
    [total, onFloorChange],
  );

  // Jump directly to a floor (used by dot nav or parent)
  const jumpTo = useCallback(
    (index: number) => {
      if (index === current || locked.current) return;
      setDir(index > current ? 1 : -1);
      locked.current = true;
      setTimeout(() => { locked.current = false; }, 620);
      setCurrent(index);
      onFloorChange?.(index);
    },
    [current, onFloorChange],
  );

  useEffect(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      wheelAcc.current += e.deltaY;
      if (wheelAcc.current > 50)       go(1);
      else if (wheelAcc.current < -50) go(-1);
    }
    function onTouchStart(e: TouchEvent) { touchY.current = e.touches[0].clientY; }
    function onTouchEnd(e: TouchEvent) {
      const delta = touchY.current - e.changedTouches[0].clientY;
      if (Math.abs(delta) > 40) go(delta > 0 ? 1 : -1);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "PageDown") go(1);
      if (e.key === "ArrowUp"   || e.key === "PageUp")   go(-1);
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  // ── Variants ────────────────────────────────────────────────────────────
  //
  // ENTER: card starts scaled down behind active card (scale 0.75, opacity 0)
  // CENTER: full size, opacity 1
  // EXIT: card flies off vertically based on direction
  //   - going forward (dir=1):  active exits DOWN  (+110%)
  //   - going back    (dir=-1): active exits UP    (-110%)
  const variants = {
    enter: (_dir: number) => ({
      y: "0%",
      scale: 0.75,
      opacity: 0,
      filter: "brightness(0.5)",
    }),
    center: {
      y: "0%",
      scale: 1,
      opacity: 1,
      filter: "brightness(1)",
      transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    exit: (direction: number) => ({
      y: direction > 0 ? "115%" : "-115%",
      scale: 1,
      opacity: 0,
      filter: "brightness(0.6)",
      transition: { duration: 0.48, ease: [0.55, 0, 1, 0.45] },
    }),
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ── Peek stack: next 2 cards sit behind, scaled down ── */}
      {[2, 1].map((offset) => {
        const idx = current + offset;
        if (idx >= total) return null;
        const s = 1 - offset * 0.08;
        const bright = 1 - offset * 0.3;
        return (
          <div
            key={`peek-${idx}-${offset}`}
            className="absolute inset-0 will-change-transform pointer-events-none"
            style={{
              zIndex: offset,
              transform: `scale(${s})`,
              filter: `brightness(${bright})`,
              opacity: 1 - offset * 0.1,
              transition: "transform 0.4s ease, filter 0.4s ease",
            }}
          >
            {floors[idx]}
          </div>
        );
      })}

      {/* ── Active card with AnimatePresence ── */}
      <AnimatePresence custom={dir} mode="sync">
        <motion.div
          key={current}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 will-change-transform"
          style={{ zIndex: 10 }}
        >
          {floors[current]}
        </motion.div>
      </AnimatePresence>

      {/* ── HUD: dot indicators ── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-50">
        {floors.map((_, i) => (
          <button
            key={i}
            onClick={() => jumpTo(i)}
            aria-label={`Floor ${i + 1}`}
            className="w-6 h-6 flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: i === current ? 1.5 : 1, opacity: i === current ? 1 : 0.3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
            />
          </button>
        ))}
      </div>

      {/* ── HUD: floor counter ── */}
      <div className="absolute left-4 bottom-6 z-50 flex items-baseline gap-1 font-mono text-xs select-none pointer-events-none">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="text-white/90 text-sm font-bold tabular-nums"
          >
            {String(current + 1).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
        <span className="text-white/30 mx-0.5">/</span>
        <span className="text-white/30">{String(total).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
