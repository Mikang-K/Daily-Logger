import { BackupService, DexieDailyLogRepository, SettingsRepository } from '../storage';

export const dailyLogRepository = new DexieDailyLogRepository();
export const backupService = new BackupService();
export const settingsRepository = new SettingsRepository();
