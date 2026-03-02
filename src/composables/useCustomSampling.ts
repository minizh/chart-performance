import { ref } from 'vue'
import { DataSamplingEngine } from '../processor/dataSamplingEngine'
import type { SamplingMethod, DataPoint } from '../types/sampling'

// 采样统计结果接口
export interface SamplingResultStats {
  samplingTime: number
  originalCount: number
  sampledCount: number
  compressionRatio: number
}

// 全局配置状态
const customSamplingEnabled = ref(false)
const customSamplingMethod = ref<SamplingMethod>('lttb')
const customSamplingMaxPoints = ref(5000)

/**
 * 设置自定义采样配置
 */
export function setCustomSamplingConfig(config: {
  enabled: boolean
  method?: SamplingMethod
  maxPoints?: number
}) {
  customSamplingEnabled.value = config.enabled
  if (config.method !== undefined) {
    customSamplingMethod.value = config.method
  }
  if (config.maxPoints !== undefined) {
    customSamplingMaxPoints.value = config.maxPoints
  }
}

/**
 * 获取当前自定义采样配置
 */
export function getCustomSamplingConfig() {
  return {
    enabled: customSamplingEnabled.value,
    method: customSamplingMethod.value,
    maxPoints: customSamplingMaxPoints.value
  }
}

/**
 * 对数据进行自定义采样
 * @param data - 原始数据数组
 * @param convertToDataPoint - 转换为 DataPoint 的函数
 * @returns 采样后的数据数组和统计信息
 */
export function applyCustomSampling<T>(
  data: T[],
  convertToDataPoint: (item: T, index: number) => DataPoint
): { 
  sampled: boolean
  data: T[]
  originalCount: number
  sampledCount: number
  stats: { samplingTime: number } | null
} {
  // 如果未启用自定义采样，直接返回原数据
  if (!customSamplingEnabled.value) {
    return {
      sampled: false,
      data,
      originalCount: data.length,
      sampledCount: data.length,
      stats: null
    }
  }

  // 如果数据量小于最大采样点数，不需要采样
  if (data.length <= customSamplingMaxPoints.value) {
    return {
      sampled: false,
      data,
      originalCount: data.length,
      sampledCount: data.length,
      stats: { samplingTime: 0 }
    }
  }

  // 转换为 DataPoint 格式
  const dataPoints = data.map((item, index) => convertToDataPoint(item, index))

  // 创建新的采样引擎实例
  const engine = new DataSamplingEngine({
    maxPoints: customSamplingMaxPoints.value,
    samplingMethod: customSamplingMethod.value
  })

  // 执行采样
  const sampledPoints = engine.sample(dataPoints, customSamplingMethod.value)

  // 将采样后的 DataPoint 映射回原始数据格式
  const sampledIndices = new Set<number>()
  sampledPoints.forEach((point) => {
    const index = dataPoints.findIndex(
      (dp) => dp.x === point.x && dp.y === point.y
    )
    if (index !== -1) {
      sampledIndices.add(index)
    }
  })

  // 按原始顺序提取采样后的数据
  const sampledData: T[] = []
  sampledIndices.forEach((index) => {
    sampledData.push(data[index])
  })

  // 获取本次采样的统计信息
  const engineStats = engine.getStatistics()

  return {
    sampled: true,
    data: sampledData,
    originalCount: data.length,
    sampledCount: sampledData.length,
    stats: { samplingTime: engineStats.samplingTime }
  }
}

/**
 * 对简单数值数组进行自定义采样
 * @param values - 数值数组
 * @param categories - 类别数组（可选）
 * @returns 采样后的数值、类别和统计信息
 */
export function applyCustomSamplingToNumbers(
  values: number[],
  categories?: string[]
): {
  sampled: boolean
  values: number[]
  categories?: string[]
  originalCount: number
  sampledCount: number
  stats: { samplingTime: number } | null
} {
  // 如果未启用自定义采样，直接返回原数据
  if (!customSamplingEnabled.value) {
    return {
      sampled: false,
      values,
      categories,
      originalCount: values.length,
      sampledCount: values.length,
      stats: null
    }
  }

  // 如果数据量小于最大采样点数，不需要采样
  if (values.length <= customSamplingMaxPoints.value) {
    return {
      sampled: false,
      values,
      categories,
      originalCount: values.length,
      sampledCount: values.length,
      stats: { samplingTime: 0 }
    }
  }

  // 转换为 DataPoint 格式
  const dataPoints: DataPoint[] = values.map((value, index) => ({
    x: index,
    y: value
  }))

  // 创建新的采样引擎实例
  const engine = new DataSamplingEngine({
    maxPoints: customSamplingMaxPoints.value,
    samplingMethod: customSamplingMethod.value
  })

  // 执行采样
  const sampledPoints = engine.sample(dataPoints, customSamplingMethod.value)

  // 提取采样后的值和类别
  const sampledValues: number[] = []
  const sampledCategories: string[] | undefined = categories ? [] : undefined

  sampledPoints.forEach((point) => {
    const index = Math.round(point.x as number)
    if (index >= 0 && index < values.length) {
      sampledValues.push(values[index])
      if (categories && sampledCategories) {
        sampledCategories.push(categories[index])
      }
    }
  })

  // 获取本次采样的统计信息
  const engineStats = engine.getStatistics()

  return {
    sampled: true,
    values: sampledValues,
    categories: sampledCategories || categories,
    originalCount: values.length,
    sampledCount: sampledValues.length,
    stats: { samplingTime: engineStats.samplingTime }
  }
}

/**
 * 重置采样统计
 */
export function resetSamplingStats() {
  // 此函数保留用于兼容性，实际统计由各个组件管理
}

/**
 * 使用自定义采样功能的组合式函数
 */
export function useCustomSampling() {
  return {
    enabled: customSamplingEnabled,
    method: customSamplingMethod,
    maxPoints: customSamplingMaxPoints,
    setConfig: setCustomSamplingConfig,
    getConfig: getCustomSamplingConfig,
    applySampling: applyCustomSampling,
    applySamplingToNumbers: applyCustomSamplingToNumbers,
    resetStats: resetSamplingStats
  }
}

// 重新导出类型
export type { SamplingMethod, DataPoint }

export default useCustomSampling
