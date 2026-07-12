import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import { useNavigate } from 'react-router-dom';
import 'driver.js/dist/driver.css';
import type { Driver, DriveStep, PopoverDOM } from 'driver.js';
import { TOUR_REPLAY_KEY, TOUR_REPLAY_EVENT, resolveTourSteps } from './steps';
import { useCompleteTourMutation } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';

let startedThisSession = false;

const addSecondaryButton = (popover: PopoverDOM, label: string, onClick: () => void) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = 'gc-tour-secondary';
  button.onclick = onClick;
  popover.footerButtons.prepend(button);
};

export default function useOnboardingTour() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const driverRef = useRef<Driver | null>(null);
  const completeTour = useCompleteTourMutation();
  const completeRef = useRef(completeTour.mutate);
  completeRef.current = completeTour.mutate;

  const startTour = useCallback(() => {
    startedThisSession = true;
    sessionStorage.removeItem(TOUR_REPLAY_KEY);
    driverRef.current?.destroy();

    const resolved = resolveTourSteps();
    const last = resolved.length - 1;
    const steps: DriveStep[] = resolved.map((step, index) => ({
      element: step.selector,
      popover: {
        title: localize(step.titleKey),
        description: localize(step.descKey),
        ...(step.selector !== undefined && { side: 'top' as const }),
        ...(index === 0 && {
          nextBtnText: localize('com_ui_tour_start'),
          onPopoverRender: (popover: PopoverDOM) =>
            addSecondaryButton(popover, localize('com_ui_tour_skip'), () =>
              driverRef.current?.destroy(),
            ),
        }),
        ...(index === last &&
          index > 0 && {
            onPopoverRender: (popover: PopoverDOM) =>
              addSecondaryButton(popover, localize('com_ui_tour_done'), () =>
                driverRef.current?.destroy(),
              ),
            onNextClick: () => {
              driverRef.current?.destroy();
              navigate('/agents');
            },
          }),
      },
    }));

    driverRef.current = driver({
      steps,
      showProgress: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      popoverClass: 'gieschat-tour',
      progressText: '{{current}} of {{total}}',
      nextBtnText: localize('com_ui_tour_next'),
      prevBtnText: localize('com_ui_tour_back'),
      doneBtnText: localize('com_ui_tour_open_marketplace'),
      onDestroyed: () => completeRef.current(),
    });
    driverRef.current.drive();
  }, [localize, navigate]);

  useEffect(() => {
    if (user == null) {
      return;
    }
    const replay = sessionStorage.getItem(TOUR_REPLAY_KEY) === '1';
    if (!replay && (startedThisSession || user.onboardingCompletedAt != null)) {
      return;
    }
    const timeout = setTimeout(() => {
      if (startedThisSession && !replay) {
        return;
      }
      startTour();
    }, 600);
    return () => clearTimeout(timeout);
  }, [user, startTour]);

  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener(TOUR_REPLAY_EVENT, handler);
    return () => {
      window.removeEventListener(TOUR_REPLAY_EVENT, handler);
      driverRef.current?.destroy();
    };
  }, [startTour]);
}
