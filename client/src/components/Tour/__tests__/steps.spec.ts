import { TOUR_STEPS, resolveTourSteps } from '../steps';

const mockVisible = (el: HTMLElement) => {
  el.getClientRects = () => [{}] as unknown as DOMRectList;
};

describe('resolveTourSteps', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('defines the approved welcome, course-tutors, and composer screens', () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual(['welcome', 'course-tutors', 'composer']);
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
