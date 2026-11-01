import { render } from 'preact';
import { App } from './ui/App';
import '../docs/design/tokens.css';
import './ui/app.css';

render(<App />, document.getElementById('app')!);
