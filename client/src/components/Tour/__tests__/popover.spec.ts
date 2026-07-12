import type { PopoverDOM } from 'driver.js';
import { addSecondaryButton } from '../useOnboardingTour';

describe('addSecondaryButton', () => {
  it('places Skip immediately after Back and before the primary action', () => {
    const footerButtons = document.createElement('div');
    const previousButton = document.createElement('button');
    previousButton.textContent = 'Back';
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    footerButtons.append(previousButton, nextButton);

    addSecondaryButton(
      { footerButtons, previousButton, nextButton } as unknown as PopoverDOM,
      'Skip',
      jest.fn(),
    );

    expect([...footerButtons.children].map((button) => button.textContent)).toEqual([
      'Back',
      'Skip',
      'Next',
    ]);
  });
});
