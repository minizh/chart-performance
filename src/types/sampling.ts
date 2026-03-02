// 数据点类型定义
export interface DataPoint {
  x: number
  y: number
  [key: string]: number | string | undefined
}

// 采样方法类型
export type SamplingMethod =
  | 'random'
  | 'stratified'
  | 'lttb'
  | 'average'
  | 'minmax'
  | 'min'
  | 'max'
  | 'sum'

// 引擎选项接口
export interface SamplingEngineOptions {
  maxPoints?: number
  samplingMethod?: SamplingMethod
}

// 采样参数接口
export interface SamplingParams {
  dimensions?: [string, string]
  maxPoints?: number
}

// 统计信息接口
export interface SamplingStatistics {
  totalProcessed: number
  totalReduced: number
  samplingTime: number
}

// 采样函数类型
export type SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
) => DataPoint[]

// 采样方法映射类型
export type SamplingMethods = Record<SamplingMethod, SamplingFunction>
