import { render } from '@testing-library/preact';
import { App } from '../src/app/App';

describe('app shell', () => {
  it('renders the farm stage', () => {
    const { container } = render(<App />);
    expect(container.querySelector('main.stage')).not.toBeNull();
  });
});
