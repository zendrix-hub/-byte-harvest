import { fireEvent, render, screen } from '@testing-library/preact';
import { showToast } from '../../src/app/store';
import { Button, Panel, ToastHost } from '../../src/ui/kit';

describe('UI kit', () => {
  it('Panel shows a title and closes with the button and with Escape', () => {
    const onClose = vi.fn();
    render(
      <Panel title="Pond" onClose={onClose}>
        <p>Body</p>
      </Panel>,
    );
    expect(screen.getByRole('dialog', { name: 'Pond' })).toHaveTextContent('Body');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Button forwards clicks and can be disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Cast</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Cast
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Cast' })).toBeDisabled();
  });

  it('ToastHost shows the current toast', () => {
    showToast('Harvested! +25g');
    render(<ToastHost />);
    expect(screen.getByRole('status')).toHaveTextContent('Harvested! +25g');
  });
});
