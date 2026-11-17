import { downloadReview, downloadSettings, reauthorize, set, useApp } from '../../app/store';
import { isTouchDevice } from '../../storage';
import { strings as S } from '../strings';
import { Icon, TopBanner } from './parts';
import { useOffline } from '../../app/offline';
import { extra } from '../strings-extra';

/**
 * 全站共用的「還沒存好」頁頂橫幅（G1）。放在頂端列正下方，不佔頁面內容的位置。
 * ① 設定有更新但沒有資料夾可寫；② 審稿進度改了卻沒存進資料夾（只在統計與輸出頁，且必須真的有改動，Issue #90）。
 * 範本編輯器的「範本還沒存進資料夾」在 EditorView 內用同一個元件。
 */
export function SaveBanners() {
  const st = useApp();
  const touch = isTouchDevice();
  const noFolder = st.folder.state !== 'ready';
  const onReviewPage = st.route === 'stats' || st.route === 'output';
  const f = st.folder;
  const offline = useOffline();
  return (
    <>
      {st.offlineReady && !offline && (
        <div class="top-banner offline-banner" role="status" data-testid="banner-offline-ready">
          <div class="top-banner-in">
            <Icon name="check" />
            <span class="top-banner-text">{extra().offline.ready}</span>
          </div>
        </div>
      )}
      {offline && (
        <div class="top-banner offline-banner" role="status" data-testid="banner-offline">
          <div class="top-banner-in">
            <Icon name="info" />
            <span class="top-banner-text">{extra().offline.banner}</span>
          </div>
        </div>
      )}
      {f.state === 'needsPermission' && st.route !== 'home' && (
        <TopBanner
          id="reauth"
          action={
            <button class="btn secondary small" type="button" data-testid="banner-reauth-btn" onClick={() => void reauthorize()}>
              {S.folder.reauthShort}
            </button>
          }
        >
          {S.folder.reauthBanner(f.name)}
        </TopBanner>
      )}
      {noFolder && st.dirty && (
        <TopBanner
          id="settings"
          action={
            <>
              {f.state === 'none' && (
                <button class="btn secondary small" type="button" data-testid="banner-pick-folder" onClick={() => set({ folderDialog: true })}>
                  {S.folder.pickBtn}
                </button>
              )}
              <button class="btn secondary small" type="button" onClick={() => void downloadSettings()}>
                {touch ? S.folder.saveToFiles : S.folder.download}
              </button>
            </>
          }
        >
          {S.folder.dirtyTitle}
        </TopBanner>
      )}
      {onReviewPage && st.review && st.reviewUnsaved && (
        <TopBanner
          id="review"
          action={
            <button class="btn secondary small" type="button" onClick={() => void downloadReview()}>
              {touch ? S.folder.saveToFiles : S.review.downloadReview}
            </button>
          }
        >
          {S.review.unsaved}
        </TopBanner>
      )}
    </>
  );
}
