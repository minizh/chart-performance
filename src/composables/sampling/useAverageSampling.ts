import type { DataPoint, SamplingParams, SamplingFunction } from '../../types/sampling'

/**
 * 平均值采样 - 将数据分成桶，取每个桶的平均值
 * @param data - 原始数据点数组
 * @param params - 采样参数
 * @param defaultMaxPoints - 默认最大点数
 * @returns 采样后的数据点数组
 */
export const useAverageSampling: SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
): DataPoint[] => {
  const [xDim, yDim] = params.dimensions || ['x', 'y']
  const targetSize = params.maxPoints || defaultMaxPoints

  if (data.length <= targetSize) return data

  const result: DataPoint[] = []
  const bucketSize = data.length / targetSize

  for (let i = 0; i < targetSize; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.floor((i + 1) * bucketSize)
    const bucket = data.slice(start, end)

    if (bucket.length === 0) continue

    const avgX = bucket.reduce((sum, p) => sum + (p[xDim] as number), 0) / bucket.length
    const avgY = bucket.reduce((sum, p) => sum + (p[yDim] as number), 0) / bucket.length

    const avgPoint: DataPoint = { ...bucket[0] }
    avgPoint[xDim] = avgX
    avgPoint[yDim] = avgY
    result.push(avgPoint)
  }

  return result
}

export default useAverageSampling
