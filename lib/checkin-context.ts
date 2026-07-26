/**
 * Format today's daily check-ins into a short coach personalization string.
 */

export type CheckInRowLike = {
  kind: string;
  mood?: number | null;
  energy?: number | null;
  focus?: number | null;
  stress?: number | null;
  sleep?: number | null;
  purpose?: number | null;
  confidence?: number | null;
  body?: number | null;
  breathing?: number | null;
  wins?: string | null;
  challenges?: string | null;
  gratitude?: string | null;
  lessons?: string | null;
  journal_note?: string | null;
};

function metric(label: string, value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${label}=${value}`;
}

/** Build a compact personalization blurb from morning/evening check-ins. */
export function formatCheckInContext(rows: CheckInRowLike[] | null | undefined): string {
  if (!rows?.length) return '';

  const parts: string[] = [];
  for (const row of rows) {
    const kind = row.kind === 'evening' ? 'evening' : 'morning';
    const metrics = [
      metric('mood', row.mood),
      metric('energy', row.energy),
      metric('focus', row.focus),
      metric('stress', row.stress),
      metric('sleep', row.sleep),
      metric('purpose', row.purpose),
      metric('confidence', row.confidence),
      metric('body', row.body),
      metric('breathing', row.breathing),
    ].filter(Boolean);

    const notes = [
      row.wins ? `wins: ${row.wins}` : null,
      row.challenges ? `challenges: ${row.challenges}` : null,
      row.gratitude ? `gratitude: ${row.gratitude}` : null,
      row.lessons ? `lessons: ${row.lessons}` : null,
      row.journal_note ? `note: ${row.journal_note}` : null,
    ].filter(Boolean);

    const chunk = [`${kind} check-in`, metrics.join(' '), notes.join('; ')].filter(Boolean).join(' · ');
    if (chunk) parts.push(chunk);
  }

  return parts.join(' | ');
}
