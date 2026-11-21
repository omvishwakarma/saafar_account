"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { airlines } from "@/lib/airlines";
import { inputClass } from "./ui";

const known = new Set<string>(airlines);

export function AirlineSelect({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState(Boolean(value) && !known.has(value));
  const [active, setActive] = useState(0);

  useEffect(() => {
    setOther(Boolean(value) && !known.has(value));
  }, [value]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return airlines.slice(0, 12);
    return airlines
      .filter((name) => name.toLowerCase().includes(needle))
      .sort((left, right) => {
        const leftStarts = left.toLowerCase().startsWith(needle) ? 0 : 1;
        const rightStarts = right.toLowerCase().startsWith(needle) ? 0 : 1;
        return leftStarts - rightStarts || left.localeCompare(right);
      })
      .slice(0, 12);
  }, [query]);

  const options = [...suggestions, "Other"];

  function choose(name: string) {
    setOpen(false);
    setQuery("");
    if (name === "Other") {
      setOther(true);
      if (known.has(value)) onChange("");
      return;
    }
    setOther(false);
    onChange(name);
  }

  const shown = open ? query : other ? "Other" : value;

  return (
    <div ref={box} className="relative">
      <input
        className={inputClass}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Search airline"
        value={shown}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
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
            setActive((index) => Math.min(index + 1, options.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const pick = options[Math.min(active, options.length - 1)];
            if (pick) choose(pick);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-paper py-1 shadow-lg" role="listbox">
          {suggestions.length === 0 && <li className="px-3 py-2 text-sm text-muted">No airline matches. Choose Other.</li>}
          {suggestions.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={value === name}
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
          <li className="border-t border-line">
            <button
              type="button"
              role="option"
              className={`block w-full px-3 py-1.5 text-left text-sm font-semibold ${active === suggestions.length ? "bg-sand" : "hover:bg-sand"}`}
              onMouseDown={(event) => {
                event.preventDefault();
                choose("Other");
              }}
            >
              Other
            </button>
          </li>
        </ul>
      )}
      {other && (
        <input
          className={`${inputClass} mt-2`}
          placeholder="Type airline name"
          aria-label="Airline name"
          value={known.has(value) ? "" : value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
