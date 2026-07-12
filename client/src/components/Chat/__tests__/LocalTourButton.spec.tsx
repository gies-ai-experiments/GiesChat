import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen } from '@testing-library/react';
import { TOUR_REPLAY_EVENT } from '~/components/Tour';
import LocalTourButton from '../LocalTourButton';

describe('LocalTourButton', () => {
  it('is hidden outside localhost', () => {
    render(<LocalTourButton isLocal={false} />);

    expect(screen.queryByRole('button', { name: 'Show walkthrough' })).not.toBeInTheDocument();
  });

  it('dispatches the existing replay event on localhost', () => {
    const replayHandler = jest.fn();
    window.addEventListener(TOUR_REPLAY_EVENT, replayHandler);

    render(<LocalTourButton isLocal />);
    fireEvent.click(screen.getByRole('button', { name: 'Show walkthrough' }));

    expect(replayHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener(TOUR_REPLAY_EVENT, replayHandler);
  });
});
