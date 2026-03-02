import type { DataPoint, SamplingParams, SamplingFunction } from '../../types/sampling'

/**
 * 随机采样 - 从数据中随机选取指定数量的点
 * @param data - 原始数据点数组
 * @param params - 采样参数
 * @param defaultMaxPoints - 默认最大点数
 * @returns 采样后的数据点数组
 */
export const useRandomSampling: SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
): DataPoint[] => {
  const targetSize = params.maxPoints || defaultMaxPoints
  if (data.length <= targetSize) return data

  const result: DataPoint[] = []
  const indices = new Set<number>()

  while (indices.size < targetSize) {
    const randomIndex = Math.floor(Math.random() * data.length)
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex)
      result.push(data[randomIndex])
    }
  }

  // 按原始顺序排序
  result.sort((a, b) => {
    const aIndex = data.indexOf(a)
    const bIndex = data.indexOf(b)
    return aIndex - bIndex
  })

  return result
}

export default useRandomSampling
