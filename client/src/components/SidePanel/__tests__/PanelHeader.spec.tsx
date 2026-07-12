import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, within } from '@testing-library/react';
import PanelHeader from '../PanelHeader';

describe('PanelHeader', () => {
  it('renders title, search, and actions in an accessible header', () => {
    render(
      <PanelHeader
        title="Files"
        search={<input aria-label="Search files" />}
        actions={<button type="button">Add file</button>}
      />,
    );

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('heading', { name: 'Files' })).toBeInTheDocument();
    expect(within(header).getByRole('textbox', { name: 'Search files' })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'Add file' })).toBeInTheDocument();
  });

  it('omits empty optional slots', () => {
    render(<PanelHeader title="Rooms" />);

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('heading', { name: 'Rooms' })).toBeInTheDocument();
    expect(within(header).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(header).queryByRole('button')).not.toBeInTheDocument();
  });
});
