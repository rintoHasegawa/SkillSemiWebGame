/**
 * eventDefinitionRegistrar.test
 * 宣言的イベント定義の登録処理の仕様適合を検証するテスト
 * 検証付きイベントについて，ガード成功時の調停実行と，ガード失敗時の調停抑止・
 * 検証失敗時処理（onInvalid）の呼び出し，および onInvalid 未指定時の破棄のみを検証する
 * subscribe / createGuard は依存注入のスタブで差し替える（Socket.IO の実接続は行わない）
 */
import { describe, expect, it, vi } from "vitest";

import { registerGuardedEvent } from "./eventDefinitionRegistrar";

type TestPayload = { value: string };

const TEST_EVENT = "test-event";

/** 登録されたリスナーを保持し，任意のペイロードで発火できる購読スタブを生成する */
const createSubscribeStub = () => {
  const listeners = new Map<string, (payload: unknown) => void>();
  const subscribe = (
    event: string,
    callback: (payload: unknown) => void,
  ): void => {
    listeners.set(event, callback);
  };
  const emit = (payload: unknown): void => {
    listeners.get(TEST_EVENT)?.(payload);
  };

  return { subscribe, emit };
};

/** 常に指定の判定結果を返すガード生成スタブを生成する */
const createGuardStub = (result: boolean) => {
  return () => {
    return (payload: unknown): payload is TestPayload => {
      // 判定結果を固定し，登録処理側の分岐のみを検証する
      void payload;

      return result;
    };
  };
};

describe("registerGuardedEvent", () => {
  it("ガードが成功した場合は調停処理がペイロードを受け取って呼ばれること", () => {
    const { subscribe, emit } = createSubscribeStub();
    const orchestrate = vi.fn();
    const onInvalid = vi.fn();
    registerGuardedEvent(subscribe, createGuardStub(true), {
      event: TEST_EVENT,
      validator: (value): value is TestPayload => true,
      orchestrate,
      onInvalid,
    });

    emit({ value: "ok" });

    expect(orchestrate).toHaveBeenCalledWith({ value: "ok" });
  });

  it("ガードが成功した場合は検証失敗時処理が呼ばれないこと", () => {
    const { subscribe, emit } = createSubscribeStub();
    const onInvalid = vi.fn();
    registerGuardedEvent(subscribe, createGuardStub(true), {
      event: TEST_EVENT,
      validator: (value): value is TestPayload => true,
      orchestrate: vi.fn(),
      onInvalid,
    });

    emit({ value: "ok" });

    expect(onInvalid).not.toHaveBeenCalled();
  });

  it("ガードが失敗した場合は調停処理が呼ばれないこと", () => {
    const { subscribe, emit } = createSubscribeStub();
    const orchestrate = vi.fn();
    registerGuardedEvent(subscribe, createGuardStub(false), {
      event: TEST_EVENT,
      validator: (value): value is TestPayload => true,
      orchestrate,
      onInvalid: vi.fn(),
    });

    emit({ value: "ng" });

    expect(orchestrate).not.toHaveBeenCalled();
  });

  it("ガードが失敗した場合は検証失敗時処理が受信ペイロードで呼ばれること", () => {
    const { subscribe, emit } = createSubscribeStub();
    const onInvalid = vi.fn();
    registerGuardedEvent(subscribe, createGuardStub(false), {
      event: TEST_EVENT,
      validator: (value): value is TestPayload => true,
      orchestrate: vi.fn(),
      onInvalid,
    });

    emit({ value: "ng" });

    expect(onInvalid).toHaveBeenCalledWith({ value: "ng" });
  });

  it("検証失敗時処理が未指定でガードが失敗しても例外を投げないこと", () => {
    const { subscribe, emit } = createSubscribeStub();
    registerGuardedEvent(subscribe, createGuardStub(false), {
      event: TEST_EVENT,
      validator: (value): value is TestPayload => true,
      orchestrate: vi.fn(),
    });

    expect(() => emit({ value: "ng" })).not.toThrow();
  });

  it("検証失敗時処理が未指定でガードが失敗した場合は調停処理が呼ばれないこと", () => {
    const { subscribe, emit } = createSubscribeStub();
    const orchestrate = vi.fn();
    registerGuardedEvent(subscribe, createGuardStub(false), {
      event: TEST_EVENT,
      validator: (value): value is TestPayload => true,
      orchestrate,
    });

    emit({ value: "ng" });

    expect(orchestrate).not.toHaveBeenCalled();
  });
});
