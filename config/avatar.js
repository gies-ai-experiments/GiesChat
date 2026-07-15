/**
 * Self-contained SVG data-URI badges for the non-tutor marketplace agents —
 * same Illini badge language as config/gies-tutors/avatar.js, with a vector
 * glyph in place of the course code. Each data URI drops straight into an
 * agent's `avatar.filepath` and renders in any `<img>` (marketplace card +
 * detail dialog).
 */

const ILLINI_BLUE = '#13294B';
const ILLINI_ORANGE = '#FF5F05';

const badge = (circle, glyph) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${circle}${glyph}</svg>`,
  )}`;

/** Navy badge with orange code brackets and a white slash. */
const appBuilderAvatar = () =>
  badge(
    `<circle cx="50" cy="50" r="50" fill="${ILLINI_BLUE}"/>`,
    `<polyline points="34,35 20,50 34,65" fill="none" stroke="${ILLINI_ORANGE}" ` +
      `stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<polyline points="66,35 80,50 66,65" fill="none" stroke="${ILLINI_ORANGE}" ` +
      `stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<line x1="56" y1="31" x2="44" y2="69" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>`,
  );

/** Orange badge with a white briefcase. */
const careerPrepAvatar = () =>
  badge(
    `<circle cx="50" cy="50" r="50" fill="${ILLINI_ORANGE}"/>`,
    `<path d="M39 37 v-4 a6 6 0 0 1 6 -6 h10 a6 6 0 0 1 6 6 v4" fill="none" ` +
      `stroke="#FFFFFF" stroke-width="6"/>` +
      `<rect x="25" y="37" width="50" height="36" rx="7" fill="none" stroke="#FFFFFF" stroke-width="6"/>`,
  );

module.exports = { appBuilderAvatar, careerPrepAvatar };
