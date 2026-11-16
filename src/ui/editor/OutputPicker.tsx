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
      <div class="out-tpls" role="radiogroup" aria-label={S.output.templateTitle}>
        {list.map((t) => (
          <label key={t.id} class={`out-tpl${t.id === cur ? ' on' : ''}`} data-testid="output-template">
            <input type="radio" name="out-template" checked={t.id === cur} onChange={() => setOutputTemplate(t.id)} aria-label={t.name} />
            <div class="out-thumb" aria-hidden="true">
              <Preview t={t} thumb />
              <span class="out-thumb-tag">{S.output.templateSample}</span>
            </div>
            <b>{t.name}</b>
            {t.id === cur && <span class="tag ok">{S.output.templateCurrent}</span>}
          </label>
        ))}
      </div>
      <div class="out-tpl-edit">
        <button class="btn ghost small" type="button" onClick={() => go('editor')}>
          {S.output.templateEdit}
        </button>
      </div>
    </div>
  );
}
