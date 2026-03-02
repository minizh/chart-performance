import type {
  DataPoint,
  SamplingMethod,
  SamplingEngineOptions,
  SamplingParams,
  SamplingStatistics,
  SamplingMethods
} from '../types/sampling'

import {
  useRandomSampling,
  useStratifiedSampling,
  useLTTBSampling,
  useAverageSampling,
  useMinMaxSampling,
  useMinSampling,
  useMaxSampling,
  useSumSampling
} from '../composables/sampling'

class DataSamplingEngine {
  private options: Required<SamplingEngineOptions>
  private methods: SamplingMethods
  public statistics: SamplingStatistics

  constructor(options: SamplingEngineOptions = {}) {
    this.options = { maxPoints: 10000, samplingMethod: 'lttb', ...options }
    this.methods = {
      random: useRandomSampling,
      stratified: useStratifiedSampling,
      lttb: useLTTBSampling,
      average: useAverageSampling,
      minmax: useMinMaxSampling,
      min: useMinSampling,
      max: useMaxSampling,
      sum: useSumSampling
    }
    this.statistics = { totalProcessed: 0, totalReduced: 0, samplingTime: 0 }
  }

  sample(
    data: DataPoint[],
    method: SamplingMethod = this.options.samplingMethod,
    params: SamplingParams = {}
  ): DataPoint[] {
    const start = performance.now()
    if (data.length <= this.options.maxPoints) return data

    const sampler = this.methods[method]
    if (!sampler) throw new Error(`Unknown method: ${method}`)

    const result = sampler(data, params, this.options.maxPoints)
    this.statistics.samplingTime = performance.now() - start
    this.statistics.totalProcessed += data.length
    this.statistics.totalReduced += result.length
    return result
  }

  /**
   * 获取统计信息
   */
  getStatistics(): SamplingStatistics {
    return { ...this.statistics }
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = { totalProcessed: 0, totalReduced: 0, samplingTime: 0 }
  }

  /**
   * 获取压缩率
   */
  getCompressionRatio(): number {
    if (this.statistics.totalProcessed === 0) return 0
    return this.statistics.totalReduced / this.statistics.totalProcessed
  }
}

export { DataSamplingEngine }
export type {
  DataPoint,
  SamplingMethod,
  SamplingEngineOptions,
  SamplingParams,
  SamplingStatistics
}
