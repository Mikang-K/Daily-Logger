export type ResourceFit = "comfortable" | "tight" | "insufficient" | "unknown";

/** Normalized model metadata from Ollama /api/tags and /api/show. */
export interface ModelResourceMetadata {
  modelId: string;
  /** Serialized model size reported by the runtime, in bytes. */
  modelBytes?: number;
  parameterCount?: number;
  /** Examples: Q4_K_M, Q5_K_M, F16. */
  quantizationLevel?: string;
}

/** Normalized GPU metadata from Ollama /api/ps and a platform GPU probe, when available. */
export interface GpuResourceMetadata {
  name?: string;
  totalVramBytes?: number;
  availableVramBytes?: number;
  /** Bytes of this model currently resident in VRAM, such as /api/ps size_vram. */
  loadedModelBytes?: number;
}

export interface RuntimeResourceSnapshot {
  model: ModelResourceMetadata;
  gpu?: GpuResourceMetadata;
}

export interface ByteRange {
  min: number;
  max: number;
}

export type EstimationBasis = "reported_model_bytes" | "parameter_quantization_range" | "loaded_model_bytes" | "none";

export interface ResourceDiagnostic {
  fit: ResourceFit;
  basis: EstimationBasis;
  modelId: string;
  comparedModelBytes?: number;
  estimatedWorkingBytes?: ByteRange;
  totalVramBytes?: number;
  availableVramBytes?: number;
  loadedModelBytes?: number;
  vramRatio?: number;
  warnings: string[];
}
