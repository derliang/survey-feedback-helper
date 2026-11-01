// 輸出頁的「輸出用範本」選擇：縮圖由真實版面產生。動態載入（和編輯器同一包），不進首頁 bundle。
import { useEffect } from 'preact/hooks';
import { go } from '../../app/store';
import { personalChoices } from '../../app/render';
import { strings as S } from '../strings';
import './editor.css';
import { Preview } from './Preview';
import { allTemplates, load, pickedTemplates, setOutputTemplate, useEditor } from './state';

export default function OutputPicker() {
  const e = useEditor();
  useEffect(() => {
    void load();
  }, []);
  if (!e.loaded) return <p class="hint">{S.output.templateLoading}</p>;
  const list = personalChoices(allTemplates(e.data));
  const cur = pickedTemplates().personal.id;
  return (
    <div>
      <div class="lib-grid" role="radiogroup" aria-label={S.output.templateTitle}>
        {list.map((t) => (
          <label key={t.id} class="lib-card" data-testid="output-template">
            <input type="radio" name="out-template" checked={t.id === cur} onChange={() => setOutputTemplate(t.id)} aria-label={t.name} />
            <div class="lib-thumb" aria-hidden="true">
              <Preview t={t} scale={0.14} thumb />
            </div>
            <span class="lib-meta">{t.name}</span>
          </label>
        ))}
      </div>
      <button class="btn secondary small" type="button" onClick={() => go('editor')}>
        {S.output.templateEdit}
      </button>
    </div>
  );
}
