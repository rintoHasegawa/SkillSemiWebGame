/**
 * InstallRequiredGate
 * スマホのブラウザ起動時にゲームを描画せず，ホーム画面追加の手順のみを全面表示するゲートコンポーネント
 * ホーム画面（PWA）から起動した場合と PC の場合は children をそのまま表示する
 */

import type { ReactNode } from "react";
import { useInstallState } from "@client/hooks/useInstallState";
import {
  InstallGuide,
  type InstallGuideType,
} from "@client/hooks/application/installState";

type Props = {
  children: ReactNode;
};

type InstallGuideStep = {
  ja: string;
  en: string;
};

type InstallGuideContent = {
  title: string;
  titleEn: string;
  note: string;
  noteEn: string;
  steps: InstallGuideStep[];
};

// ホーム画面追加を促す場合の共通見出し（iOS Safari・Android・その他で共通）
const ADD_TO_HOME_SCREEN_HEADING = {
  title: "ホーム画面に追加してください",
  titleEn: "Please add this app to your Home Screen.",
  note: "スマホではホーム画面から起動した場合のみプレイできます",
  noteEn: "On smartphones, the game runs only from the Home Screen icon.",
} as const satisfies Omit<InstallGuideContent, "steps">;

// 追加後の起動を促す共通の最終手順
const LAUNCH_FROM_ICON_STEP: InstallGuideStep = {
  ja: "追加されたアイコンからアプリを起動する",
  en: "Launch the app from the added icon.",
};

// 手順種別ごとの日英併記テキスト
const GUIDE_CONTENTS: Record<InstallGuideType, InstallGuideContent> = {
  [InstallGuide.IOS_SAFARI]: {
    ...ADD_TO_HOME_SCREEN_HEADING,
    steps: [
      {
        ja: "画面下の共有ボタン（□に↑）をタップする",
        en: "Tap the Share button at the bottom of Safari.",
      },
      {
        ja: "メニューから「ホーム画面に追加」をタップする",
        en: 'Tap "Add to Home Screen" in the menu.',
      },
      LAUNCH_FROM_ICON_STEP,
    ],
  },
  [InstallGuide.IOS_OTHER_BROWSER]: {
    title: "Safari で開いてください",
    titleEn: "Please open this page in Safari.",
    note: "iOS ではホーム画面への追加が Safari でのみ行えます",
    noteEn: "On iOS, adding to the Home Screen is available only in Safari.",
    steps: [
      {
        ja: "このページの URL をコピーする",
        en: "Copy the URL of this page.",
      },
      {
        ja: "Safari を開いて URL を貼り付けてアクセスする",
        en: "Open Safari and paste the URL.",
      },
      {
        ja: "共有ボタン →「ホーム画面に追加」をタップする",
        en: 'Tap the Share button, then "Add to Home Screen".',
      },
    ],
  },
  [InstallGuide.ANDROID]: {
    ...ADD_TO_HOME_SCREEN_HEADING,
    steps: [
      {
        ja: "ブラウザのメニュー（︙）を開く",
        en: "Open the browser menu (︙).",
      },
      {
        ja: "「ホーム画面に追加」または「アプリをインストール」をタップする",
        en: 'Tap "Add to Home screen" or "Install app".',
      },
      LAUNCH_FROM_ICON_STEP,
    ],
  },
  [InstallGuide.UNKNOWN]: {
    ...ADD_TO_HOME_SCREEN_HEADING,
    steps: [
      {
        ja: "ブラウザのメニューを開く",
        en: "Open the browser menu.",
      },
      {
        ja: "「ホーム画面に追加」を選ぶ",
        en: 'Choose "Add to Home Screen".',
      },
      LAUNCH_FROM_ICON_STEP,
    ],
  },
};

/** インストール済み（PWA 起動）または PC のときのみ children を表示するゲート */
export const InstallRequiredGate = ({ children }: Props) => {
  const { installState, canPromptInstall, promptInstall } = useInstallState();

  // PC・ホーム画面起動・デバッグ用クエリ指定ではゲームをそのまま表示する
  if (installState.status === "allowed") {
    return <>{children}</>;
  }

  const guideContent = GUIDE_CONTENTS[installState.guide];
  const shouldShowInstallButton =
    installState.guide === InstallGuide.ANDROID && canPromptInstall;

  return (
    <>
      {/* 手順表示オーバーレイのレイアウトスタイル */}
      <style>{`
        .install-required-gate {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          overflow-y: auto;
          background: #111;
          color: #fff;
          text-align: center;
          padding: 24px 20px;
          box-sizing: border-box;
        }

        .install-required-title {
          margin: 0 0 4px;
          font-size: 20px;
        }

        .install-required-title-en {
          margin: 0 0 16px;
          font-size: 12px;
          color: #bbb;
        }

        .install-required-note {
          margin: 0 0 2px;
          font-size: 13px;
          color: #ddd;
        }

        .install-required-note-en {
          margin: 0 0 16px;
          font-size: 11px;
          color: #888;
        }

        .install-required-steps {
          margin: 0;
          padding: 0 0 0 20px;
          max-width: 520px;
          text-align: left;
        }

        .install-required-step {
          margin-bottom: 10px;
          font-size: 14px;
          line-height: 1.5;
        }

        .install-required-step-en {
          display: block;
          font-size: 11px;
          color: #888;
        }

        .install-required-button {
          margin-bottom: 20px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          background: #4caf50;
          color: #fff;
          font-size: 16px;
          font-weight: bold;
        }
      `}</style>

      {/* スマホのブラウザ起動時に全面表示するホーム画面追加の手順 */}
      <div className="install-required-gate">
        <h2 className="install-required-title">{guideContent.title}</h2>
        <p className="install-required-title-en">{guideContent.titleEn}</p>
        <p className="install-required-note">{guideContent.note}</p>
        <p className="install-required-note-en">{guideContent.noteEn}</p>

        {/* Android でプロンプトを捕捉できた場合のみ追加ボタンを表示する */}
        {shouldShowInstallButton && (
          <button
            type="button"
            className="install-required-button"
            onClick={promptInstall}
          >
            ホーム画面に追加 / Add to Home Screen
          </button>
        )}

        <ol className="install-required-steps">
          {guideContent.steps.map((step) => (
            <li key={step.ja} className="install-required-step">
              {step.ja}
              <span className="install-required-step-en">{step.en}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
};
