import type { DailyLog } from '../domain';
import type { EditableMeal } from '../features/calorie-estimation/types';

export type AppTab = 'today' | 'history' | 'insights' | 'settings';
export type AppMeal = EditableMeal;
export type AppExercise = { id: string; name: string; minutes: number };
export type AppLog = {
  date: string;
  weight?: number;
  water?: number;
  condition?: number;
  note: string;
  meals: AppMeal[];
  exercises: AppExercise[];
};

export const today = new Date().toLocaleDateString('sv-SE');

export const appTabs: { id: AppTab; label: string }[] = [
  { id: 'today', label: '오늘' },
  { id: 'history', label: '기록' },
  { id: 'insights', label: '통계' },
  { id: 'settings', label: '설정' },
];

export const blankLog = (date = today): AppLog => ({
  date,
  note: '',
  meals: [],
  exercises: [],
});

export const numberOrUndefined = (value: string) => value === '' ? undefined : Number(value);

export const fromStored = (log: DailyLog): AppLog => ({
  date: log.date,
  weight: log.weightKg,
  water: log.waterMl,
  condition: log.condition,
  note: log.note ?? '',
  meals: log.meals,
  exercises: log.exercises.map(exercise => ({
    id: exercise.id,
    name: exercise.name,
    minutes: exercise.durationMinutes,
  })),
});

export const toStored = (log: AppLog): DailyLog => {
  const now = new Date().toISOString();
  return {
    date: log.date,
    weightKg: log.weight,
    waterMl: log.water,
    condition: log.condition as DailyLog['condition'],
    note: log.note || undefined,
    meals: log.meals.map(meal => ({
      ...meal,
      type: meal.type as DailyLog['meals'][number]['type'],
    })),
    exercises: log.exercises.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      durationMinutes: exercise.minutes,
    })),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
};
