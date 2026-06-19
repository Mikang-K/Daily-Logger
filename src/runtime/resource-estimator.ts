import type { ByteRange, EstimationBasis, ResourceDiagnostic, RuntimeResourceSnapshot } from "./types";

const finitePositive = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const quantizationBits = (level: string | undefined): ByteRange | undefined => {
  if (!level) return undefined;
  const normalized = level.trim().toUpperCase();
  if (/^(?:Q2|IQ2)/.test(normalized)) return { min: 2, max: 3 };
  if (/^(?:Q3|IQ3)/.test(normalized)) return { min: 3, max: 4 };
  if (/^(?:Q4|IQ4)/.test(normalized)) return { min: 4, max: 5 };
  if (/^Q5/.test(normalized)) return { min: 5, max: 6 };
  if (/^Q6/.test(normalized)) return { min: 6, max: 7 };
  if (/^Q8/.test(normalized)) return { min: 8, max: 9 };
  if (/^(?:F16|FP16|BF16)/.test(normalized)) return { min: 16, max: 17 };
  if (/^(?:F32|FP32)/.test(normalized)) return { min: 32, max: 33 };
  return undefined;
};

const parameterRange = (parameterCount: number | undefined, quantization: string | undefined): ByteRange | undefined => {
  if (!finitePositive(parameterCount)) return undefined;
  const bits = quantizationBits(quantization);
  if (!bits) return undefined;
  // This is deliberately a range: container metadata and runtime working buffers are not derivable here.
  return { min: parameterCount * bits.min / 8, max: parameterCount * bits.max / 8 };
};

const roundRatio = (value: number): number => Math.round(value * 100) / 100;

/**
 * Pure GPU-fit estimator. It does not infer total system RAM requirements.
 * Thresholds reserve 25% VRAM for context, runtime buffers, and display use.
 */
export class RuntimeResourceEstimator {
  diagnose(snapshot: RuntimeResourceSnapshot): ResourceDiagnostic {
    const { model, gpu } = snapshot;
    const warnings: string[] = [];
    const reportedBytes = finitePositive(model.modelBytes) ? model.modelBytes : undefined;
    const loadedBytes = finitePositive(gpu?.loadedModelBytes) ? gpu.loadedModelBytes : undefined;
    const range = reportedBytes ? undefined : parameterRange(model.parameterCount, model.quantizationLevel);
    const totalVram = finitePositive(gpu?.totalVramBytes) ? gpu.totalVramBytes : undefined;
    const availableVram = finitePositive(gpu?.availableVramBytes) ? gpu.availableVramBytes : undefined;

    let basis: EstimationBasis = "none";
    let comparedBytes: number | undefined;
    if (reportedBytes) {
      basis = "reported_model_bytes";
      comparedBytes = reportedBytes;
      warnings.push("표시된 모델 파일 크기는 실제 실행 중 RAM·VRAM 사용량과 다를 수 있습니다.");
    } else if (range) {
      basis = "parameter_quantization_range";
      comparedBytes = range.max;
      warnings.push("파라미터 수와 양자화 정보로 범위만 추정했습니다. 정확한 메모리 요구량은 알 수 없습니다.");
    } else if (loadedBytes) {
      basis = "loaded_model_bytes";
      comparedBytes = loadedBytes;
      warnings.push("현재 GPU 적재량만 확인되었습니다. 재실행 시 필요한 전체 메모리와 다를 수 있습니다.");
    }

    if (!comparedBytes) {
      warnings.push("모델 크기 정보가 없어 메모리 적합도를 판단할 수 없습니다.");
      return { fit: "unknown", basis, modelId: model.modelId, totalVramBytes: totalVram, availableVramBytes: availableVram, loadedModelBytes: loadedBytes, warnings };
    }
    if (!totalVram) {
      warnings.push("GPU VRAM 정보가 없어 GPU 적합도를 판단할 수 없습니다.");
      return { fit: "unknown", basis, modelId: model.modelId, comparedModelBytes: reportedBytes, estimatedWorkingBytes: range, availableVramBytes: availableVram, loadedModelBytes: loadedBytes, warnings };
    }

    const ratio = comparedBytes / totalVram;
    const fit = ratio <= 0.75 ? "comfortable" : ratio <= 1 ? "tight" : "insufficient";
    if (fit === "comfortable") warnings.push("알려진 모델 크기는 GPU VRAM에 비교적 여유 있게 들어갑니다. 실행 버퍼에 따라 사용량은 달라질 수 있습니다.");
    if (fit === "tight") warnings.push("GPU VRAM 여유가 작을 수 있습니다. 긴 입력이나 다른 GPU 사용 작업이 응답 속도에 영향을 줄 수 있습니다.");
    if (fit === "insufficient") warnings.push("모델 전체를 GPU VRAM에 적재하기 어려울 수 있습니다. 런타임이 CPU와 시스템 RAM을 함께 사용하면 실행은 가능하지만 느려질 수 있습니다.");

    return {
      fit,
      basis,
      modelId: model.modelId,
      comparedModelBytes: reportedBytes,
      estimatedWorkingBytes: range,
      totalVramBytes: totalVram,
      availableVramBytes: availableVram,
      loadedModelBytes: loadedBytes,
      vramRatio: roundRatio(ratio),
      warnings,
    };
  }
}

export const estimateRuntimeResources = (snapshot: RuntimeResourceSnapshot): ResourceDiagnostic =>
  new RuntimeResourceEstimator().diagnose(snapshot);
