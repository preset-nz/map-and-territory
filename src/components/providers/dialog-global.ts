interface BaseOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface PromptOptions extends BaseOptions {
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | null; // return error message or null
}

export interface DialogAPI {
  alert(opts: BaseOptions): Promise<void>;
  confirm(opts: BaseOptions): Promise<boolean>;
  prompt(opts: PromptOptions): Promise<string | null>;
}

let api: DialogAPI | null = null;

export function setDialogApi(instance: DialogAPI | null) {
  api = instance;
}

export function getDialogApi(): DialogAPI | null {
  return api;
}
