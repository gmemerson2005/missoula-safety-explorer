/**
 * Field-level redaction, enforced at the data boundary.
 *
 * THE PATTERN: restricted values are STRIPPED ON THE SERVER before rows are
 * handed to any component that will render (or serialize) for a non-analyst
 * visitor. The client never receives the real value — the ▮▮▮▮ treatment in
 * the UI is a courtesy rendering of a sentinel, not a mask over data that
 * shipped anyway. Client-side hiding is not access control.
 *
 * The same helper feeds the AI chat context (see /api/chat): a public chat
 * session's system prompt is built from rows that went through this filter,
 * so the model literally cannot leak values it never received.
 */

import type { FeatureProperties } from "./arcgis";
import type { DatasetConfig } from "./datasets";

/**
 * Sentinel that replaces a restricted value in non-analyst payloads. UI
 * components detect it and render the lock treatment; even if it leaked
 * verbatim it carries nothing.
 */
export const RESTRICTED_SENTINEL = "__RESTRICTED__";

/** Keys of fields marked `restricted` in a dataset's field map. */
export function restrictedKeys(dataset: DatasetConfig): string[] {
  return dataset.tableFields.filter((f) => f.restricted).map((f) => f.key);
}

/**
 * Returns rows safe for the given role. Analysts get the input unchanged;
 * everyone else gets copies with restricted values replaced by the sentinel.
 */
export function redactRows(
  dataset: DatasetConfig,
  rows: FeatureProperties[],
  role: "public" | "analyst"
): FeatureProperties[] {
  if (role === "analyst") return rows;
  const keys = restrictedKeys(dataset);
  if (keys.length === 0) return rows;
  return rows.map((row) => {
    const copy: FeatureProperties = { ...row };
    for (const key of keys) {
      if (key in copy) copy[key] = RESTRICTED_SENTINEL;
    }
    return copy;
  });
}
