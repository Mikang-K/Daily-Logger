import type { DietLogBackup } from "./models";
import { dietLogBackupSchema } from "./schemas";

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export const parseBackupJson = (json: string): DietLogBackup => {
  if (new Blob([json]).size > MAX_BACKUP_BYTES) {
    throw new Error("백업 파일은 10MB 이하여야 합니다.");
  }

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("올바른 JSON 파일이 아닙니다.");
  }

  return dietLogBackupSchema.parse(value);
};

export const serializeBackup = (backup: DietLogBackup): string =>
  JSON.stringify(dietLogBackupSchema.parse(backup), null, 2);
