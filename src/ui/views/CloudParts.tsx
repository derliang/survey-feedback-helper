import type { SaveFailure } from "../../google/quota";
import { strings as S } from "../strings";

/** 存檔失敗的文字（5.28 表格）；句尾依有沒有資料夾而不同。 */
export function saveMessage(kind: SaveFailure, hasFolder: boolean): string {
  if (kind === "auth") return S.cloud.auth;
  if (kind === "rate") return S.cloud.rate;
  return S.cloud[kind](hasFolder);
}

/** 四句說明：登入前卡與開啟確認卡一字不差（DESIGN.md 5.28）。 */
export function CloudExplain() {
  return (
    <div class="g-cloud-explain">
      <h3>{S.cloud.cardTitle}</h3>
      <ul class="plain-list">
        <li>{S.cloud.s1}</li>
        <li>{S.cloud.s2}</li>
        <li>{S.cloud.s3}</li>
        <li>{S.cloud.s4}</li>
      </ul>
    </div>
  );
}

/** 開關（預設關）：登入前卡直接用；設定頁另外包確認卡。 */
export function CloudSwitch(props: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label class="g-switch">
      <input
        type="checkbox"
        role="switch"
        checked={props.on}
        onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
        data-testid="cloud-switch"
      />
      <span>
        <strong>{S.cloud.switchLabel}</strong>
        <small>{props.on ? S.cloud.switchOn : S.cloud.switchOff}</small>
      </span>
    </label>
  );
}

