"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  initial: string;
  signOutAction: () => Promise<void>;
};

export function ProfileMenu({ name, email, initial, signOutAction }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 224;
      const spacing = 12;
      const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
      const top = rect.bottom + spacing;
      setMenuPosition({ top, left });
    }

    if (open) {
      updatePosition();
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--stroke)] bg-[var(--text-primary)] text-sm font-bold text-white transition hover:ring-2 hover:ring-[var(--bg-hero)]"
      >
        {initial}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="menu"
            aria-label="Profile menu"
            className="surface-card fixed z-[9999] w-56 rounded-2xl border border-[var(--stroke)]/30 bg-white p-3 shadow-lg"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            ref={menuRef}
          >
            <div className="space-y-1 px-1 pb-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{name || "Account"}</p>
              <p className="text-xs text-[var(--text-muted)]">{email || "Signed in"}</p>
            </div>

            <div className="border-t border-[var(--stroke)]/20 pt-3">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="focus-ring w-full rounded-xl border border-[var(--stroke)] bg-[var(--text-primary)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
