/**
 * eventDefinitionRegistrar
 * 宣言的イベント定義の登録処理を共通化する
 */

/** 受信payloadハンドラをバイバリアントに扱うための型 */
type BivariantPayloadHandler<TPayload> = {
  bivarianceHack: (payload: TPayload) => void | Promise<void>;
}["bivarianceHack"];

/** 検証付きイベント定義 */
export type GuardedEventDefinition<TEvent extends string, TPayload> = {
  event: TEvent;
  validator: (value: unknown) => value is TPayload;
  orchestrate: BivariantPayloadHandler<TPayload>;
};

/** 自前検証イベント定義 */
export type SelfValidatedEventDefinition<TEvent extends string, TPayload> = {
  event: TEvent;
  validator: (value: unknown) => value is TPayload;
  orchestrate: BivariantPayloadHandler<TPayload>;
};

/** 検証不要イベント定義 */
export type UnguardedEventDefinition<TEvent extends string> = {
  event: TEvent;
  orchestrate: () => void | Promise<void>;
};

/** 汎用イベント定義 */
export type EventDefinition<TEvent extends string, TPayload> = {
  event: TEvent;
  orchestrate: (payload: TPayload) => void | Promise<void>;
};

/** 検証付きイベント定義を登録する */
export const registerGuardedEvents = <TEvent extends string>(
  subscribe: (event: TEvent, callback: (payload: unknown) => void) => void,
  createGuard: <TPayload>(
    event: TEvent,
    validator: (value: unknown) => value is TPayload,
  ) => (payload: unknown) => payload is TPayload,
  definitions: GuardedEventDefinition<TEvent, any>[],
): void => {
  definitions.forEach((definition) => {
    const guard = createGuard(definition.event, definition.validator);
    subscribe(definition.event, (payload) => {
      if (!guard(payload)) {
        return;
      }

      void definition.orchestrate(payload);
    });
  });
};

/** 自前検証イベント定義を登録する */
export const registerSelfValidatedEvents = <TEvent extends string>(
  subscribe: (event: TEvent, callback: (payload: unknown) => void) => void,
  definitions: SelfValidatedEventDefinition<TEvent, any>[],
): void => {
  definitions.forEach((definition) => {
    subscribe(definition.event, (payload) => {
      if (!definition.validator(payload)) {
        return;
      }

      void definition.orchestrate(payload);
    });
  });
};

/** 検証不要イベント定義を登録する */
export const registerUnguardedEvents = <TEvent extends string>(
  subscribe: (event: TEvent, callback: () => void) => void,
  definitions: UnguardedEventDefinition<TEvent>[],
): void => {
  definitions.forEach((definition) => {
    subscribe(definition.event, () => {
      void definition.orchestrate();
    });
  });
};

/** 汎用イベント定義を登録する */
export const registerEvents = <TEvent extends string, TPayload>(
  subscribe: (event: TEvent, callback: (payload: TPayload) => void) => void,
  definitions: EventDefinition<TEvent, TPayload>[],
): void => {
  definitions.forEach((definition) => {
    subscribe(definition.event, (payload) => {
      void definition.orchestrate(payload);
    });
  });
};
