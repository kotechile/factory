/**
 * The hero schematic's payload caption is fed by the calling product (`inputDetail`), so its length is
 * not controlled by the diagram. The payload card is a fixed 146px wide with 16px padding — ~130px of
 * usable width — and a caption that outgrows it spills past the card's right edge, straight into the
 * dashed beam that leaves that edge.
 *
 * That is not hypothetical: the CaseProof caption ("vendor lines, buyer basis", 26 characters) did exactly
 * that, and the vision gate flagged the collision ("text 'vendor lines, buyer basis' overlaps with dashed
 * line in diagram") — a real defect, confirmed by sampling the beam's path against the label's box.
 *
 * So the caption is wrapped to a width the card can hold. Pure and unit-tested: the monotone advance of
 * `ui-monospace` at the caption's font size is what the character budget is derived from, and any line
 * longer than the budget is what breaks the geometry.
 */

/**
 * Characters that fit the payload card's usable width at the caption's font size.
 * 130px usable / ~5.7px per character at 9.5px `ui-monospace` ≈ 22, with one character of slack.
 */
export const CAPTION_MAX_CHARS = 22;

/**
 * Wrap a caption into at most `maxLines` lines of at most `maxChars` characters.
 * Words longer than a line are hard-split (a single long token must not defeat the budget), and the last
 * line is ellipsised when the text cannot fit, so the return value always satisfies the width contract.
 */
export function wrapCaption(
  text: string,
  maxChars: number = CAPTION_MAX_CHARS,
  maxLines = 2,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of words) {
    let candidate = word;
    // A word longer than a full line is split across lines rather than allowed to overflow.
    while (candidate.length > maxChars) {
      pushCurrent();
      if (lines.length >= maxLines) break;
      lines.push(candidate.slice(0, maxChars));
      candidate = candidate.slice(maxChars);
    }
    if (lines.length >= maxLines) break;
    if (!current) {
      current = candidate;
    } else if (`${current} ${candidate}`.length <= maxChars) {
      current = `${current} ${candidate}`;
    } else {
      pushCurrent();
      current = candidate;
    }
  }
  pushCurrent();

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  return kept;
}
