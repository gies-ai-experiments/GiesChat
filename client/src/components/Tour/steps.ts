import type { TranslationKeys } from '~/hooks/useLocalize';

export const TOUR_REPLAY_KEY = 'gieschat:tour-replay';
export const TOUR_REPLAY_EVENT = 'gieschat:tour-replay';

export interface TourStepDef {
  id: 'welcome' | 'course-tutors' | 'composer';
  selector?: string;
  fallbackSelector?: string;
  titleKey: TranslationKeys;
  descKey: TranslationKeys;
  nextKey: TranslationKeys;
  centered?: boolean;
  centeredWhenMissing?: boolean;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    titleKey: 'com_ui_tour_welcome_title',
    descKey: 'com_ui_tour_welcome_desc',
    nextKey: 'com_ui_tour_difference',
    centered: true,
  },
  {
    id: 'course-tutors',
    selector: '[data-testid="nav-agents-button"]',
    fallbackSelector: '[data-testid="nav-more-button"]',
    titleKey: 'com_ui_tour_tutors_title',
    descKey: 'com_ui_tour_tutors_desc',
    nextKey: 'com_ui_tour_next',
  },
  {
    id: 'composer',
    selector: '[data-tour="chat-composer"]',
    titleKey: 'com_ui_tour_composer_title',
    descKey: 'com_ui_tour_composer_desc',
    nextKey: 'com_ui_tour_done',
    centeredWhenMissing: true,
  },
];

const isVisible = (selector: string) =>
  (document.querySelector(selector)?.getClientRects().length ?? 0) > 0;

export function resolveTourSteps(steps: TourStepDef[] = TOUR_STEPS): TourStepDef[] {
  return steps.flatMap((step) => {
    if (step.selector === undefined) {
      return [step];
    }

    const selector = isVisible(step.selector)
      ? step.selector
      : step.fallbackSelector !== undefined && isVisible(step.fallbackSelector)
        ? step.fallbackSelector
        : undefined;

    if (selector === undefined && !step.centeredWhenMissing) {
      return [];
    }

    return [{ ...step, selector }];
  });
}
