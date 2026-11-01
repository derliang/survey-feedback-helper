import { render } from 'preact';
import { registerAssetCache } from './fonts/register-sw';
import { App } from './ui/App';
import '../docs/design/tokens.css';
import './ui/app.css';

render(<App />, document.getElementById('app')!);

// PWA：正式站才註冊 Service Worker（離線也能開；不快取問卷資料）
if (import.meta.env.PROD) void registerAssetCache();
