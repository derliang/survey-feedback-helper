import { render } from 'preact';
import { registerAssetCache } from './fonts/register-sw';
import { App } from './ui/App';
import { onUpdateWaiting } from './app/update';
import { announceOfflineReady } from './app/offline';
import '../docs/design/tokens.css';
import './ui/app.css';

const root = document.getElementById('app')!;
root.replaceChildren(); // 清掉 index.html 內的靜態載入畫面
render(<App />, root);

// PWA：正式站才註冊 Service Worker（離線也能開；不快取問卷資料）
if (import.meta.env.PROD) void registerAssetCache(onUpdateWaiting, announceOfflineReady);
