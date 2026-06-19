import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { DexieDailyLogRepository } from '../../storage';

describe('App', () => {
  it('adds a meal and updates the calorie summary', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: /식사 추가/ }));
    await user.type(screen.getByLabelText('식사 1 이름'), '현미밥');
    await user.type(screen.getByLabelText('식사 1 칼로리'), '350');
    expect(screen.getByLabelText('오늘 요약')).toHaveTextContent('350');
  });

  it('navigates to an empty history screen', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: '기록' }));
    expect(screen.getByRole('heading', { name: '지난 기록' })).toBeInTheDocument();
  });

  it('shows an accessible validation error for an empty meal name', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: /식사 추가/ }));
    await user.type(screen.getByLabelText('식사 1 칼로리'), '350');
    await user.click(screen.getByRole('button', { name: '오늘 기록 저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('입력 내용을 확인해 주세요');
  });

  it('loads the saved log when the selected date changes', async () => {
    const storedDate = '2026-06-01';
    const timestamp = new Date().toISOString();
    const lookup = vi.spyOn(DexieDailyLogRepository.prototype, 'getByDate').mockResolvedValue({ date: storedDate, weightKg: 72.5, meals: [], exercises: [], createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 });
    render(<App />);
    fireEvent.change(screen.getByLabelText('기록 날짜'), { target: { value: storedDate } });
    expect(await screen.findByDisplayValue('72.5')).toBeInTheDocument();
    expect(lookup).toHaveBeenCalledWith(storedDate);
    lookup.mockRestore();
  });
});
