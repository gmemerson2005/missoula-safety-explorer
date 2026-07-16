"use client";
// Client Component — deliberately. Text search and column sorting are pure
// view-state over rows the SERVER already fetched and passed down as
// serializable props. No data is fetched here, and being a client component
// grants no extra access: an unauthenticated request is redirected by the
// proxy before this component's props are ever rendered into a payload.

import { useMemo, useState } from "react";

type CellValue = string | number | boolean | null;

export interface DataTableColumn {
  key: string;
  label: string;
}

interface DataTableProps {
  /** Used to label the search input for screen readers. */
  title: string;
  /** Columns shown by default. */
  visible: DataTableColumn[];
  /** Internal bookkeeping columns, hidden until the user opts in. */
  internal?: DataTableColumn[];
  rows: Record<string, CellValue>[];
}

type SortDir = "asc" | "desc";

function isBlank(value: CellValue): boolean {
  return value === null || value === undefined || value === "";
}

/** Compares non-blank values only; blank handling lives in the sort callback. */
function compareValues(a: CellValue, b: CellValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en", { numeric: true });
}

/**
 * ArcGIS serves date fields as epoch milliseconds; render those as ISO dates
 * (detected by field name) instead of 13-digit numbers.
 */
function formatCell(key: string, value: CellValue): string {
  if (isBlank(value)) return "—";
  if (typeof value === "number") {
    if (/date$/i.test(key) && value > 10_000_000_000) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return String(value);
}

export default function DataTable({ title, visible, internal = [], rows }: DataTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showInternal, setShowInternal] = useState(false);

  const columns = useMemo(
    () => (showInternal ? [...visible, ...internal] : visible),
    [visible, internal, showInternal]
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = q
      ? rows.filter((row) =>
          columns.some((col) =>
            String(row[col.key] ?? "")
              .toLowerCase()
              .includes(q)
          )
        )
      : rows;
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        // Blanks sort last in BOTH directions, so their ordering is decided
        // here and deliberately not run through the direction flip below.
        const aBlank = isBlank(av);
        const bBlank = isBlank(bv);
        if (aBlank || bBlank) return aBlank && bBlank ? 0 : aBlank ? 1 : -1;
        const cmp = compareValues(av, bv);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, columns, query, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const searchId = `${title.replace(/\s+/g, "-").toLowerCase()}-search`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={searchId}
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted"
        >
          Filter
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="w-full max-w-xs border border-line bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-faint"
        />
        {internal.length > 0 ? (
          <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-faint hover:text-muted">
            <input
              type="checkbox"
              checked={showInternal}
              onChange={(e) => setShowInternal(e.target.checked)}
              className="accent-current"
            />
            Show internal fields ({internal.length})
          </label>
        ) : null}
        <span
          role="status"
          className="ml-auto font-mono text-[11px] uppercase tracking-widest text-faint"
        >
          {visibleRows.length.toLocaleString("en-US")} /{" "}
          {rows.length.toLocaleString("en-US")} records
        </span>
      </div>

      {/* tabIndex + role make the clipped region keyboard-scrollable in
          Firefox/Safari, where scroll containers aren't focusable by default. */}
      <div
        tabIndex={0}
        role="region"
        aria-label={`${title} table, scrollable`}
        className="mt-3 max-h-[480px] overflow-auto border border-line"
      >
        <table className="w-full border-collapse font-mono text-xs">
          <caption className="sr-only">{title}</caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="border-b border-line p-0 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex w-full items-center gap-1 px-3 py-2 text-left uppercase tracking-wider text-muted hover:text-foreground"
                    >
                      {col.label}
                      <span aria-hidden="true" className="text-tier-text">
                        {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-line/60 last:border-b-0 hover:bg-surface-2"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-1.5 align-top text-foreground/90">
                    {formatCell(col.key, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center uppercase tracking-widest text-faint"
                >
                  No records match
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
