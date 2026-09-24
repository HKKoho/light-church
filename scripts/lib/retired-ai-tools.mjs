// Default AI Tools that have been replaced by a built-in Light Church page.
// An installed copy is removed only while it is still the default (its
// tool.json url is unchanged), so a church's own tool of the same name stays.
export const RETIRED_AI_TOOLS = [
  // Replaced by the built-in, editable Mission/Camp Companion at /activities.
  { name: 'mission-camp-companion', url: 'https://indonesia-trip.vercel.app/' },
];

/** True when this tool.json text is the untouched retired default. */
export function isRetiredDefault(name, toolJsonText) {
  const retired = RETIRED_AI_TOOLS.find((r) => r.name === name);
  if (!retired || toolJsonText === null) return false;
  try {
    return JSON.parse(toolJsonText).url === retired.url;
  } catch {
    return false;
  }
}
