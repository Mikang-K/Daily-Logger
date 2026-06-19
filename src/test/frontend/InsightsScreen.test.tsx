import { render, screen } from '@testing-library/react';

import type { DailyLog } from '../../domain';
import { InsightsScreen } from '../../features/insights/InsightsScreen';

const log = (date: string, weightKg: number, calories: number, durationMinutes: number): DailyLog => ({
  date,
  weightKg,
  meals: [{ id: `${date}-meal`, type: 'lunch', name: '식사', calories }],
  exercises: [{ id: `${date}-exercise`, name: '걷기', durationMinutes }],
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z',
  schemaVersion: 1,
});

describe('InsightsScreen', () => {
  it('shows weekly averages, samples, and previous-week comparisons', () => {
    render(<InsightsScreen logs={[
      log('2026-06-08', 71, 2_000, 20),
      log('2026-06-15', 70, 1_800, 30),
      log('2026-06-17', 69, 1_600, 50),
    ]} today="2026-06-19" />);

    expect(screen.getByRole('heading', { name: '주간 평균' })).toBeInTheDocument();
    expect(screen.getByLabelText('이번 주 평균 요약')).toHaveTextContent('69.5 kg');
    expect(screen.getByLabelText('이번 주 평균 요약')).toHaveTextContent('1,700 kcal');
    expect(screen.getByLabelText('이번 주 평균 요약')).toHaveTextContent('40 분');
    expect(screen.getByText('체중 2회')).toBeInTheDocument();
    expect(screen.getByText('지난주보다 1.5kg 낮음')).toBeInTheDocument();
  });

  it('shows honest empty and sparse-data states', () => {
    const { rerender } = render(<InsightsScreen logs={[]} today="2026-06-19" />);
    expect(screen.getAllByText('비교할 지난주 기록이 없어요')).toHaveLength(3);
    expect(screen.getByText(/체중을 기록하면/)).toBeInTheDocument();

    rerender(<InsightsScreen logs={[log('2026-06-15', 70, 1_800, 30)]} today="2026-06-19" />);
    expect(screen.getByRole('note')).toHaveTextContent('체중 기록이 1회뿐');
  });
});
