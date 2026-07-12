import { TOUR_STEPS, resolveTourSteps } from '../steps';

const mockVisible = (el: HTMLElement) => {
  el.getClientRects = () => [{}] as unknown as DOMRectList;
};

describe('resolveTourSteps', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps anchor-less steps and drops steps whose selector is missing', () => {
    const resolved = resolveTourSteps();
    expect(resolved).toHaveLength(2);
    expect(resolved.every((step) => step.selector === undefined)).toBe(true);
  });

  it('keeps steps whose anchors exist and are visible', () => {
    const modelPicker = document.createElement('div');
    modelPicker.setAttribute('data-tour', 'model-picker');
    mockVisible(modelPicker);
    document.body.appendChild(modelPicker);

    const resolved = resolveTourSteps();
    expect(resolved).toHaveLength(3);
    expect(resolved[1].selector).toBe('[data-tour="model-picker"]');
  });

  it('drops anchors that exist but have no layout (hidden)', () => {
    const mcp = document.createElement('div');
    mcp.setAttribute('data-tour', 'mcp-select');
    document.body.appendChild(mcp);

    expect(resolveTourSteps()).toHaveLength(2);
  });

  it('defines exactly the five approved steps', () => {
    expect(TOUR_STEPS).toHaveLength(5);
  });
});
