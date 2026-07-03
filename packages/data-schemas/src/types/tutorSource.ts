import type { Document, Types } from 'mongoose';

export type TutorSource = {
  /** Course tag — matches the tutor agent's category value (e.g. 'badm_350') */
  courseValue: string;
  /** Source page URL */
  url: string;
  /** Page title */
  title?: string;
  /** Extracted plain-text content (raw) */
  text?: string;
  /** GPT-5.4 summary of the page (what gets injected when present) */
  summary?: string;
  /** When the page was last scraped */
  scrapedAt?: Date;
};

export type ITutorSource = TutorSource &
  Document & {
    _id: Types.ObjectId;
  };
