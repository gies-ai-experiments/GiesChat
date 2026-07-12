import type { TranslationKeys } from '~/hooks/useLocalize';

export const TOUR_REPLAY_KEY = 'gieschat:tour-replay';
export const TOUR_REPLAY_EVENT = 'gieschat:tour-replay';

export interface TourStepDef {
  selector?: string;
  titleKey: TranslationKeys;
  descKey: TranslationKeys;
}

export const TOUR_STEPS: TourStepDef[] = [
  { titleKey: 'com_ui_tour_welcome_title', descKey: 'com_ui_tour_welcome_desc' },
  {
    selector: '[data-tour="model-picker"]',
    titleKey: 'com_ui_tour_models_title',
    descKey: 'com_ui_tour_models_desc',
  },
  {
    selector: '[data-tour="mcp-select"]',
    titleKey: 'com_ui_tour_mcp_title',
    descKey: 'com_ui_tour_mcp_desc',
  },
  {
    selector: '[data-testid="nav-more-button"]',
    titleKey: 'com_ui_tour_tutors_title',
    descKey: 'com_ui_tour_tutors_desc',
  },
  { titleKey: 'com_ui_tour_builder_title', descKey: 'com_ui_tour_builder_desc' },
];

export function resolveTourSteps(steps: TourStepDef[] = TOUR_STEPS): TourStepDef[] {
  return steps.filter(
    (step) =>
      step.selector === undefined ||
      (document.querySelector(step.selector)?.getClientRects().length ?? 0) > 0,
  );
}
