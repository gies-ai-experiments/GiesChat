/**
 * Builds a self-contained SVG data-URI badge for a tutor agent's avatar.
 * Illini-branded circle, department prefix as the hero glyph, course number
 * as a subline so each tutor is visually distinct. No file storage — the
 * data URI drops straight into the agent's `avatar.filepath` and renders in
 * any `<img>` (marketplace card + detail dialog).
 */

const ILLINI_BLUE = '#13294B';
const ILLINI_ORANGE = '#FF5F05';

/**
 * Category → the badge's circle markup. Three distinct on-brand looks:
 * Finance = solid navy, Accounting = solid orange, Business Administration =
 * navy center with an orange ring (text always sits on a solid color).
 */
const badgeCircles = (category) => {
  const key = String(category || '').toLowerCase();
  if (key.startsWith('account')) {
    return `<circle cx="50" cy="50" r="50" fill="${ILLINI_ORANGE}"/>`;
  }
  if (key.startsWith('business')) {
    return (
      `<circle cx="50" cy="50" r="50" fill="${ILLINI_ORANGE}"/>` +
      `<circle cx="50" cy="50" r="42" fill="${ILLINI_BLUE}"/>`
    );
  }
  return `<circle cx="50" cy="50" r="50" fill="${ILLINI_BLUE}"/>`;
};

/** Shrink the prefix text so longer department codes (ECON, ACCY, BADM) still fit. */
const prefixFontSize = (prefix) => (prefix.length >= 4 ? 26 : 32);

const buildAvatarDataUri = (entry) => {
  const [prefix, ...rest] = String(entry.courseCode).trim().split(/\s+/);
  const number = rest.join(' ');
  const numberEl = number
    ? `<text x="50" y="74" text-anchor="middle" font-family="Arial, sans-serif" ` +
      `font-size="18" font-weight="600" fill="#FFFFFF" fill-opacity="0.9">${number}</text>`
    : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    badgeCircles(entry.category) +
    `<text x="50" y="${number ? 48 : 58}" text-anchor="middle" font-family="Arial, sans-serif" ` +
    `font-size="${prefixFontSize(prefix)}" font-weight="800" fill="#FFFFFF" ` +
    `letter-spacing="1">${prefix}</text>` +
    numberEl +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

module.exports = { buildAvatarDataUri };
