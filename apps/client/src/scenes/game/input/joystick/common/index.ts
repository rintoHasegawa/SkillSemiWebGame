/**
 * index
 * ジョイスティック入力の共通型と共通定数の再公開を担う
 * 呼び出し側のimport先を共通化する
 */
/** 共有型を再公開する */
export type {
	JoystickPointerEvent,
	NormalizedInput,
	Point,
	UseJoystickControllerProps,
	UseJoystickControllerReturn,
	UseJoystickInputPresenterProps,
	UseJoystickStateProps,
	UseJoystickStateReturn,
} from './joystick.types';

/** 共有定数を再公開する */
export { MAX_DIST } from './joystick.constants';
