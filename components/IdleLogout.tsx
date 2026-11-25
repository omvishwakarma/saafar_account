"use client";

import { startTransition, useEffect } from "react";
import { logoutIdle, touchActivity } from "@/lib/auth-actions";
import { IDLE_MS } from "@/lib/idle";

const PING_GAP = 30 * 1000;

export function IdleLogout() {
  useEffect(() => {
    let last = Date.now();
    let lastPing = Date.now();
    let stopped = false;
    let timer = 0;

    const expire = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      startTransition(() => {
        void logoutIdle();
      });
    };

    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(expire, IDLE_MS);
    };

    const ping = () => {
      const now = Date.now();
      if (now - lastPing < PING_GAP) return;
      lastPing = now;
      startTransition(() => {
        void touchActivity();
      });
    };

    const mark = () => {
      if (stopped) return;
      last = Date.now();
      arm();
      ping();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= IDLE_MS) expire();
    };

    const options = { capture: true, passive: true } as const;
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "wheel"] as const;
    for (const event of events) document.addEventListener(event, mark, options);
    document.addEventListener("visibilitychange", onVisible);
    arm();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      for (const event of events) document.removeEventListener(event, mark, options);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
