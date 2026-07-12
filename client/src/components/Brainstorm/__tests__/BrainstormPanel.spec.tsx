import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen } from '@testing-library/react';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('~/data-provider', () => ({
  useGetRoomsQuery: () => ({ data: [], isLoading: false }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) =>
    ({
      com_ui_rooms: 'Rooms',
      com_ui_brainstorm: 'Brainstorm',
      com_ui_brainstorm_dashboard: 'Open dashboard',
      com_ui_brainstorm_new_room: 'New room',
      com_ui_brainstorm_empty: 'No rooms yet.',
    })[key] ?? key,
}));

import BrainstormPanel from '../BrainstormPanel';

describe('BrainstormPanel presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels the collaborative panel as Rooms without changing its dashboard route', () => {
    render(<BrainstormPanel />);

    expect(screen.getByRole('heading', { name: 'Rooms' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open dashboard' }));
    expect(mockNavigate).toHaveBeenCalledWith('/brainstorm');
  });
});
