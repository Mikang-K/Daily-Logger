import { describe, expect, it } from "vitest";
import { estimateRuntimeResources, RuntimeResourceEstimator } from "../../runtime";

const GIB = 1024 ** 3;

describe("RuntimeResourceEstimator", () => {
  const estimator = new RuntimeResourceEstimator();

  it("classifies an observed 23.9 GiB model against 12 GiB VRAM as insufficient for full GPU placement", () => {
    const result = estimator.diagnose({
      model: { modelId: "large-local-model", modelBytes: 23.9 * GIB, parameterCount: 32_000_000_000, quantizationLevel: "Q6_K" },
      gpu: { name: "12GB GPU", totalVramBytes: 12 * GIB, availableVramBytes: 11 * GIB },
    });

    expect(result.fit).toBe("insufficient");
    expect(result.vramRatio).toBe(1.99);
    expect(result.warnings.join(" ")).toContain("CPU와 시스템 RAM");
    expect(result.warnings.join(" ")).not.toMatch(/정확히|반드시/);
  });

  it("classifies a smaller 8B-like Q4 model as comfortable on 12 GiB VRAM", () => {
    const result = estimateRuntimeResources({
      model: { modelId: "8b-q4", modelBytes: 4.7 * GIB, parameterCount: 8_000_000_000, quantizationLevel: "Q4_K_M" },
      gpu: { totalVramBytes: 12 * GIB, loadedModelBytes: 4.6 * GIB },
    });

    expect(result.fit).toBe("comfortable");
    expect(result.basis).toBe("reported_model_bytes");
  });

  it.each([
    [9 * GIB, "comfortable"],
    [9 * GIB + 1, "tight"],
    [12 * GIB, "tight"],
    [12 * GIB + 1, "insufficient"],
  ] as const)("applies the reserved-VRAM boundary for %s bytes", (modelBytes, fit) => {
    expect(estimator.diagnose({ model: { modelId: "boundary", modelBytes }, gpu: { totalVramBytes: 12 * GIB } }).fit).toBe(fit);
  });

  it("returns a range and neutral warning when only parameter and quantization metadata exist", () => {
    const result = estimator.diagnose({ model: { modelId: "8b-q4", parameterCount: 8_000_000_000, quantizationLevel: "Q4_K_M" }, gpu: { totalVramBytes: 12 * GIB } });
    expect(result.basis).toBe("parameter_quantization_range");
    expect(result.estimatedWorkingBytes).toEqual({ min: 4_000_000_000, max: 5_000_000_000 });
    expect(result.warnings.join(" ")).toContain("정확한 메모리 요구량은 알 수 없습니다");
  });

  it("stays unknown rather than inventing RAM requirements when metadata is absent", () => {
    const result = estimator.diagnose({ model: { modelId: "unknown" }, gpu: { totalVramBytes: 12 * GIB } });
    expect(result.fit).toBe("unknown");
    expect(result.comparedModelBytes).toBeUndefined();
    expect(result.estimatedWorkingBytes).toBeUndefined();
  });
});
