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
  columns: DataTableColumn[];
  rows: Record<string, CellValue>[];
}

type SortDir = "asc" | "desc";

function compareValues(a: CellValue, b: CellValue): number {
  // Nulls sort last regardless of direction of the non-null comparison.
  if (a === null || a === undefined || a === "") return 1;
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en", { numeric: true });
}

export default function DataTable({ title, columns, rows }: DataTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
        const cmp = compareValues(a[sortKey], b[sortKey]);
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
        <span
          role="status"
          className="ml-auto font-mono text-[11px] uppercase tracking-widest text-faint"
        >
          {visibleRows.length.toLocaleString("en-US")} /{" "}
          {rows.length.toLocaleString("en-US")} records
        </span>
      </div>

      <div className="mt-3 max-h-[480px] overflow-auto border border-line">
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
                      className="flex w-full items-center gap-1 px-3 py-2 text-left uppercase tracking-wider text-muted hover:text-accent-hover"
                    >
                      {col.label}
                      <span aria-hidden="true" className="text-accent">
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
                    {row[col.key] === null || row[col.key] === undefined || row[col.key] === ""
                      ? "—"
                      : typeof row[col.key] === "number"
                        ? (row[col.key] as number).toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })
                        : String(row[col.key])}
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
