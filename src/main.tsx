import '@fontsource-variable/nunito';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
