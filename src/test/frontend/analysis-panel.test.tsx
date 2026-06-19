import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisPanel } from '../../features/analysis/AnalysisPanel';
import type { AnalysisController } from '../../features/analysis/analysis-controller';

const result = {
  summary: '기록된 내용만 바탕으로 요약했습니다.',
  positivePatterns: ['물을 꾸준히 기록했습니다.'],
  attentionPoints: ['일부 식사 기록이 비어 있습니다.'],
  nextActions: ['내일도 물 섭취량을 기록해 보세요.'],
  dataLimitations: ['기록 기간이 짧습니다.'],
  safetyNotice: '이 내용은 의료 조언이 아닙니다.',
};

function controller(overrides: Partial<AnalysisController> = {}): AnalysisController {
  return {
    checkConnection: vi.fn().mockResolvedValue({ models: [{ id: 'local-model', name: 'Local Model', sizeBytes: 5 * 1024 ** 3, resourceFit: 'unknown', resourceWarnings: ['GPU VRAM 정보가 없어 GPU 적합도를 판단할 수 없습니다.'] }] }),
    preloadModel: vi.fn().mockResolvedValue({ message: '모델 로딩이 완료되었습니다.' }),
    analyze: vi.fn().mockResolvedValue(result),
    ...overrides,
  };
}

describe('AnalysisPanel', () => {
  beforeEach(() => localStorage.clear());

  it('requires a saved record and exposes sent data before analysis', () => {
    render(<AnalysisPanel controller={controller()} date="2026-06-19" inputFingerprint="v1" hasSavedRecord={false} />);
    expect(screen.getByText('분석 시 전달되는 항목')).toBeInTheDocument();
    expect(screen.getByText(/먼저 이 날짜의 기록을 저장/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로컬 AI로 분석' })).toBeDisabled();
  });

  it('checks connection, selects a model, and renders plain text results', async () => {
    const user = userEvent.setup();
    const service = controller();
    render(<AnalysisPanel controller={service} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    expect(await screen.findByText('모델 로딩 필요')).toBeInTheDocument();
    expect(screen.getByText('선택 모델: Local Model (5.0 GB)')).toBeInTheDocument();
    expect(screen.getByText(/GPU VRAM 정보가 없어/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '선택 모델 불러오기' }));
    expect(await screen.findByText('분석 준비됨')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '로컬 AI로 분석' }));
    expect(await screen.findByText('분석 완료')).toBeInTheDocument();
    expect(screen.getByText(result.summary)).toBeInTheDocument();
    expect(screen.getByText(result.safetyNotice)).toBeInTheDocument();
    expect(service.analyze).toHaveBeenCalledWith(
      { date: '2026-06-19' },
      expect.objectContaining({ modelId: 'local-model', timeoutSeconds: 300 }),
      expect.any(AbortSignal),
      expect.any(Function),
    );
  });

  it('announces an unavailable runtime as an alert', async () => {
    const user = userEvent.setup();
    render(<AnalysisPanel controller={controller({ checkConnection: vi.fn().mockRejectedValue(new Error('서버가 꺼져 있습니다.')) })} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('서버가 꺼져 있습니다.');
    expect(screen.getByText('로컬 AI를 사용할 수 없음')).toBeInTheDocument();
  });

  it('cancels a generating request', async () => {
    const user = userEvent.setup();
    const service = controller({
      analyze: vi.fn((_input, _settings, signal) => new Promise<typeof result>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })),
    });
    render(<AnalysisPanel controller={service} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    await screen.findByText('모델 로딩 필요');
    await user.click(screen.getByRole('button', { name: '선택 모델 불러오기' }));
    await screen.findByText('분석 준비됨');
    await user.click(screen.getByRole('button', { name: '로컬 AI로 분석' }));
    await user.click(screen.getByRole('button', { name: '분석 취소' }));
    expect(await screen.findByText('분석을 취소했습니다.')).toBeInTheDocument();
  });

  it('marks a completed result stale when the input changes', async () => {
    const user = userEvent.setup();
    const service = controller();
    const view = render(<AnalysisPanel controller={service} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    await screen.findByText('모델 로딩 필요');
    await user.click(screen.getByRole('button', { name: '선택 모델 불러오기' }));
    await screen.findByText('분석 준비됨');
    await user.click(screen.getByRole('button', { name: '로컬 AI로 분석' }));
    await screen.findByText('분석 완료');
    view.rerender(<AnalysisPanel controller={service} date="2026-06-19" inputFingerprint="v2" hasSavedRecord />);
    expect(await screen.findByText('기록 변경 후 다시 분석 필요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변경 내용 다시 분석' })).toBeEnabled();
  });

  it('does not carry a completed result to another selected date', async () => {
    const user = userEvent.setup();
    const service = controller();
    const view = render(<AnalysisPanel key="2026-06-19" controller={service} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    await screen.findByText('모델 로딩 필요');
    await user.click(screen.getByRole('button', { name: '선택 모델 불러오기' }));
    await screen.findByText('분석 준비됨');
    await user.click(screen.getByRole('button', { name: '로컬 AI로 분석' }));
    expect(await screen.findByText('2026-06-19 분석 결과')).toBeInTheDocument();

    view.rerender(<AnalysisPanel key="2026-06-20" controller={service} date="2026-06-20" inputFingerprint="v2" hasSavedRecord />);
    expect(screen.queryByText('2026-06-19 분석 결과')).not.toBeInTheDocument();
    expect(screen.getByText('연결 확인 전')).toBeInTheDocument();
  });

  it('clears a displayed result when runtime settings change', async () => {
    const user = userEvent.setup();
    const service = controller();
    render(<AnalysisPanel controller={service} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    await screen.findByText('모델 로딩 필요');
    await user.click(screen.getByRole('button', { name: '선택 모델 불러오기' }));
    await screen.findByText('분석 준비됨');
    await user.click(screen.getByRole('button', { name: '로컬 AI로 분석' }));
    await screen.findByText('2026-06-19 분석 결과');
    await user.clear(screen.getByLabelText('로컬 AI 주소'));
    await user.type(screen.getByLabelText('로컬 AI 주소'), 'http://localhost:11434');
    expect(screen.queryByText('2026-06-19 분석 결과')).not.toBeInTheDocument();
    expect(screen.getByText('연결 확인 전')).toBeInTheDocument();
  });

  it('falls back safely when persisted runtime settings have wrong types', async () => {
    localStorage.setItem('daily-log:llm-runtime', JSON.stringify({ endpoint: 42, modelId: ['unsafe'], timeoutSeconds: 999 }));
    const user = userEvent.setup();
    render(<AnalysisPanel controller={controller()} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    expect(screen.getByLabelText('로컬 AI 주소')).toHaveValue('http://127.0.0.1:11434');
    expect(screen.getByLabelText('로컬 AI 모델')).toHaveValue('');
    expect(screen.getByLabelText('응답 제한 시간')).toHaveValue('300');
  });

  it('falls back safely when persisted runtime settings are malformed JSON', async () => {
    localStorage.setItem('daily-log:llm-runtime', '{not-json');
    const user = userEvent.setup();
    render(<AnalysisPanel controller={controller()} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    expect(screen.getByLabelText('로컬 AI 주소')).toHaveValue('http://127.0.0.1:11434');
    expect(screen.getByLabelText('로컬 AI 모델')).toHaveValue('');
  });

  it('persists only a supported timeout selection', async () => {
    const user = userEvent.setup();
    const view = render(<AnalysisPanel controller={controller()} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.selectOptions(screen.getByLabelText('응답 제한 시간'), '600');
    expect(JSON.parse(localStorage.getItem('daily-log:llm-runtime') ?? '{}')).toMatchObject({ timeoutSeconds: 600 });
    view.unmount();
    render(<AnalysisPanel controller={controller()} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    expect(screen.getByLabelText('응답 제한 시간')).toHaveValue('600');
  });

  it('announces model loading and allows cancellation', async () => {
    const user = userEvent.setup();
    const service = controller({
      preloadModel: vi.fn((_settings, signal, onProgress) => new Promise<{ message?: string }>((_resolve, reject) => {
        onProgress?.({ phase: 'loading' });
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })),
    });
    render(<AnalysisPanel controller={service} date="2026-06-19" inputFingerprint="v1" hasSavedRecord />);
    await user.click(screen.getByText('로컬 AI 연결 설정'));
    await user.click(screen.getByRole('button', { name: '연결 확인' }));
    await screen.findByText('모델 로딩 필요');
    await user.click(screen.getByRole('button', { name: '선택 모델 불러오기' }));
    expect(await screen.findByText('모델 로딩 중')).toBeInTheDocument();
    expect(screen.getByText('모델 파일을 메모리에 불러오는 중입니다.')).toHaveAttribute('role', 'status');
    await user.click(screen.getByRole('button', { name: '모델 로딩 취소' }));
    expect(await screen.findByText('모델 로딩을 취소했습니다.')).toBeInTheDocument();
    expect(screen.getByText('모델 로딩 필요')).toBeInTheDocument();
  });
});
