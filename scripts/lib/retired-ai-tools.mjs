// Default AI Tools that have been replaced by a built-in Light Church page.
// An installed copy is removed only while it is still the default (checked
// against its tool.json), so a church's own tool of the same name stays.
export const RETIRED_AI_TOOLS = [
  // Replaced by the built-in, editable Mission/Camp Companion at /activities.
  {
    name: 'mission-camp-companion',
    isDefault: (meta) => meta.url === 'https://indonesia-trip.vercel.app/',
  },
  // Replaced by the built-in Roll Call at /roll-call (its Simple mode is the
  // original 茶果嶺浸信會點名應用程式).
  {
    name: 'roll-call',
    isDefault: (meta) =>
      !meta.url && ['Roll Call', 'Quick Roll Call'].includes(meta.displayName?.en ?? ''),
  },
];

/** True when this tool.json text is the untouched retired default. */
export function isRetiredDefault(name, toolJsonText) {
  const retired = RETIRED_AI_TOOLS.find((r) => r.name === name);
  if (!retired || toolJsonText === null) return false;
  try {
    return retired.isDefault(JSON.parse(toolJsonText));
  } catch {
    return false;
  }
}
