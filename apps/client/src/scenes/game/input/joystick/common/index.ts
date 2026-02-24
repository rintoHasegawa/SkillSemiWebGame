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
	UseJoystickViewProps,
} from './joystick.types';

/** 共有定数を再公開する */
export {
	JOYSTICK_BASE_BG_COLOR,
	JOYSTICK_BASE_BORDER_COLOR,
	JOYSTICK_BASE_BORDER_WIDTH,
	JOYSTICK_KNOB_BG_COLOR,
	JOYSTICK_KNOB_SHADOW,
	JOYSTICK_KNOB_SIZE,
	MAX_DIST,
} from './joystick.constants';
