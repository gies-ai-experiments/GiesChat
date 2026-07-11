/**
 * @jest-environment jsdom
 */
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import IconPicker, { buildIconAvatarSvg } from '../IconPicker';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: jest.fn() }),
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  OGDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  OGDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  OGDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('buildIconAvatarSvg', () => {
  it('renders a circle in the chosen color with the icon strokes in white', () => {
    const svg = buildIconAvatarSvg('<path d="M1 1h22"/>', '#123456');

    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('stroke="#FFFFFF"');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<path d="M1 1h22"/>');
  });
});

describe('IconPicker', () => {
  it('renders the icon grid and enables Apply only after an icon is selected', async () => {
    const user = userEvent.setup();
    render(<IconPicker onClose={jest.fn()} onApply={jest.fn()} />);

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'));
    expect(iconButtons.length).toBeGreaterThanOrEqual(40);

    const applyButton = screen.getByRole('button', { name: 'com_ui_apply' });
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Briefcase' }));
    expect(applyButton).toBeEnabled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<IconPicker onClose={onClose} onApply={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'com_ui_cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
