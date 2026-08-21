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
import {
  AddToHomeScreenIcon,
  AppLaunchIcon,
  BrowserMenuIcon,
  ConfirmIcon,
  LinkIcon,
  SafariIcon,
  ShareIcon,
  ToggleOnIcon,
  type InstallGuideIcon,
} from "./installGuideIcons";

type Props = {
  children: ReactNode;
};

type InstallGuideStep = {
  ja: string;
  en: string;
  /** 手順の内容を補助するインライン SVG アイコン */
  icon: InstallGuideIcon;
  /** 補足の注記（つまずきやすい点のみ設定する） */
  hintJa?: string;
  hintEn?: string;
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
  ja: "ホーム画面に追加されたアイコンからアプリを起動する",
  en: "Launch the app from the icon added to your Home Screen.",
  icon: AppLaunchIcon,
};

// 手順種別ごとの日英併記テキストとアイコン
const GUIDE_CONTENTS: Record<InstallGuideType, InstallGuideContent> = {
  [InstallGuide.IOS_SAFARI]: {
    ...ADD_TO_HOME_SCREEN_HEADING,
    steps: [
      {
        ja: "Safari 下部の「共有」（Share）ボタンをタップする",
        en: "Tap the Share button at the bottom of Safari.",
        icon: ShareIcon,
      },
      {
        ja: "「ホーム画面に追加」（Add to Home Screen）をタップする",
        en: 'Tap "Add to Home Screen" in the menu.',
        icon: AddToHomeScreenIcon,
      },
      {
        ja: "「Web アプリとして開く」（Open as Web App）がオンになっていることを確認して「追加」（Add）をタップする",
        en: 'Make sure "Open as Web App" is on, then tap "Add".',
        icon: ToggleOnIcon,
        hintJa: "オフのままだとブックマークとして追加され，Safari で開いてしまう",
        hintEn: "If it stays off, it is added as a bookmark and opens in Safari.",
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
        icon: LinkIcon,
      },
      {
        ja: "Safari を開いて URL を貼り付けてアクセスする",
        en: "Open Safari and paste the URL.",
        icon: SafariIcon,
      },
      {
        ja: "Safari で「共有」（Share）→「ホーム画面に追加」（Add to Home Screen）をタップする",
        en: 'In Safari, tap the Share button, then "Add to Home Screen".',
        icon: ShareIcon,
      },
    ],
  },
  [InstallGuide.ANDROID]: {
    ...ADD_TO_HOME_SCREEN_HEADING,
    steps: [
      {
        ja: "ブラウザ右上のメニュー（⋮）を開く",
        en: "Open the browser menu (⋮) at the top right.",
        icon: BrowserMenuIcon,
      },
      {
        ja: "「ホーム画面に追加」（Add to Home screen）または「アプリをインストール」（Install app）をタップする",
        en: 'Tap "Add to Home screen" or "Install app".',
        icon: AddToHomeScreenIcon,
      },
      {
        ja: "確認画面で「追加」（Add）または「インストール」（Install）をタップする",
        en: 'Tap "Add" or "Install" on the confirmation dialog.',
        icon: ConfirmIcon,
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
        icon: BrowserMenuIcon,
      },
      {
        ja: "「ホーム画面に追加」（Add to Home Screen）を選ぶ",
        en: 'Choose "Add to Home Screen".',
        icon: AddToHomeScreenIcon,
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
          overflow-y: auto;
          background: #111;
          color: #fff;
          text-align: center;
          padding: 24px 20px;
          box-sizing: border-box;
        }

        .install-required-content {
          margin: auto;
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
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
          padding: 0;
          width: 100%;
          list-style: none;
          text-align: left;
        }

        .install-required-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 14px;
          line-height: 1.5;
        }

        .install-required-step-number {
          flex: 0 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 22px;
          height: 22px;
          margin-top: 2px;
          border-radius: 50%;
          background: #333;
          color: #fff;
          font-size: 12px;
          font-weight: bold;
        }

        .install-required-step-icon {
          flex: 0 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 28px;
          height: 28px;
          color: #fff;
        }

        .install-required-step-text {
          flex: 1 1 auto;
        }

        .install-required-step-en {
          display: block;
          font-size: 11px;
          color: #888;
        }

        .install-required-step-hint {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          line-height: 1.4;
          color: #f0c060;
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
        <div className="install-required-content">
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

          {/* 番号・アイコン・日英併記テキストを 1 行にまとめた手順リスト */}
          <ol className="install-required-steps">
            {guideContent.steps.map((step, index) => {
              const StepIcon = step.icon;

              return (
                <li key={step.ja} className="install-required-step">
                  <span className="install-required-step-number">
                    {index + 1}
                  </span>
                  <span className="install-required-step-icon">
                    <StepIcon />
                  </span>
                  <span className="install-required-step-text">
                    {step.ja}
                    <span className="install-required-step-en">{step.en}</span>
                    {step.hintJa !== undefined && (
                      <span className="install-required-step-hint">
                        ※ {step.hintJa}
                        <span className="install-required-step-en">
                          {step.hintEn}
                        </span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
};
