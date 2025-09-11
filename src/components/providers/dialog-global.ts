import type { DialogAPI } from "@/components/providers/dialog-provider";

let api: DialogAPI | null = null;

export function setDialogApi(instance: DialogAPI | null) {
  api = instance;
}

export function getDialogApi(): DialogAPI | null {
  return api;
}
