"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listHotelNames, saveHotelName } from "@/lib/hotel-actions";
import { inputClass } from "./ui";

export function HotelNameSelect({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    listHotelNames().then(setNames).catch(() => setNames([]));
  }, []);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const needle = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const source = needle ? names.filter((name) => name.toLowerCase().includes(needle)) : names.slice(0, 12);
    return source
      .sort((left, right) => {
        const leftStarts = left.toLowerCase().startsWith(needle) ? 0 : 1;
        const rightStarts = right.toLowerCase().startsWith(needle) ? 0 : 1;
        return leftStarts - rightStarts || left.localeCompare(right);
      })
      .slice(0, 12);
  }, [names, needle]);
  const exact = names.find((name) => name.toLowerCase() === needle);
  const canSave = needle.length >= 2 && !exact;
  const options = canSave ? [...suggestions, query.trim()] : suggestions;

  function choose(name: string) {
    const picked = names.find((item) => item.toLowerCase() === name.trim().toLowerCase()) || name.trim();
    onChange(picked);
    setQuery("");
    setOpen(false);
  }

  async function keepTyped() {
    const typed = query.trim();
    if (typed.length < 2) {
      setOpen(false);
      return;
    }
    const known = names.find((name) => name.toLowerCase() === typed.toLowerCase());
    if (known) {
      choose(known);
      return;
    }
    const result = await saveHotelName(typed);
    if (!result.ok) return;
    setNames((current) => (current.some((name) => name.toLowerCase() === result.name.toLowerCase()) ? current : [...current, result.name].sort((a, b) => a.localeCompare(b))));
    onChange(result.name);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <input
        className={inputClass}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Search hotel"
        value={open ? query : value}
        onFocus={() => {
          setOpen(true);
          setQuery(value);
          setActive(0);
        }}
        onBlur={() => {
          if (query.trim() && query.trim().toLowerCase() !== value.trim().toLowerCase()) void keepTyped();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const pick = options[active];
            if (canSave && active === suggestions.length) void keepTyped();
            else if (pick) choose(pick);
            else void keepTyped();
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-paper py-1 shadow-lg" role="listbox">
          {suggestions.length === 0 && !canSave && <li className="px-3 py-2 text-sm text-muted">Type a hotel name</li>}
          {suggestions.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                className={`block w-full px-3 py-1.5 text-left text-sm ${index === active ? "bg-sand" : "hover:bg-sand"}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(name);
                }}
              >
                {name}
              </button>
            </li>
          ))}
          {canSave && (
            <li className="border-t border-line">
              <button
                type="button"
                role="option"
                className={`block w-full px-3 py-1.5 text-left text-sm font-semibold ${active === suggestions.length ? "bg-sand" : "hover:bg-sand"}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  void keepTyped();
                }}
              >
                Save “{query.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
