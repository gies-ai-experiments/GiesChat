import { TOUR_STEPS, resolveTourSteps } from '../steps';

const mockVisible = (el: HTMLElement) => {
  el.getClientRects = () => [{}] as unknown as DOMRectList;
};

describe('resolveTourSteps', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('defines the spread-out tour in order', () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual([
      'welcome',
      'new-chat',
      'chats',
      'rooms',
      'composer',
      'model-picker',
      'model-menu',
      'course-tutors',
    ]);
  });

  it('advances on real clicks for the interactive steps only', () => {
    const interactive = TOUR_STEPS.filter((step) => step.advanceOnClick === true).map(
      (step) => step.id,
    );
    expect(interactive).toEqual([
      'new-chat',
      'chats',
      'rooms',
      'model-picker',
      'model-menu',
      'course-tutors',
    ]);
  });

  it('keeps the model-menu step with a deferred selector while the picker is visible', () => {
    const picker = document.createElement('div');
    picker.dataset.tour = 'model-picker';
    mockVisible(picker);
    document.body.appendChild(picker);

    const modelMenu = resolveTourSteps().find((step) => step.id === 'model-menu');
    expect(modelMenu?.selector).toBe('[data-tour="model-menu"]');
  });

  it('drops the model-menu step when the picker is unavailable', () => {
    expect(resolveTourSteps().find((step) => step.id === 'model-menu')).toBeUndefined();
  });

  it('only advances model-menu on an actual model choice', () => {
    const modelMenu = TOUR_STEPS.find((step) => step.id === 'model-menu');
    expect(modelMenu?.clickTargetSelector).toBe('[role="menuitemradio"],[role="option"]');
  });

  it('uses More only when the direct Agents destination is unavailable', () => {
    const more = document.createElement('button');
    more.dataset.testid = 'nav-more-button';
    mockVisible(more);
    document.body.appendChild(more);

    const courseTutors = resolveTourSteps().find((step) => step.id === 'course-tutors');
    expect(courseTutors?.selector).toBe('[data-testid="nav-more-button"]');
  });

  it('prefers the direct Agents destination when both targets are visible', () => {
    const agents = document.createElement('a');
    agents.dataset.testid = 'nav-agents-button';
    mockVisible(agents);
    document.body.appendChild(agents);

    const more = document.createElement('button');
    more.dataset.testid = 'nav-more-button';
    mockVisible(more);
    document.body.appendChild(more);

    const courseTutors = resolveTourSteps().find((step) => step.id === 'course-tutors');
    expect(courseTutors?.selector).toBe('[data-testid="nav-agents-button"]');
  });

  it('omits unavailable spotlights while retaining the centered welcome and composer', () => {
    expect(resolveTourSteps().map((step) => step.id)).toEqual(['welcome', 'composer']);
  });

  it('keeps the composer as a spotlight when it is visible', () => {
    const composer = document.createElement('div');
    composer.dataset.tour = 'chat-composer';
    mockVisible(composer);
    document.body.appendChild(composer);

    const composerStep = resolveTourSteps().find((step) => step.id === 'composer');
    expect(composerStep?.selector).toBe('[data-tour="chat-composer"]');
  });
});
