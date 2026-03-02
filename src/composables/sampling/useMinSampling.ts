import type { DataPoint, SamplingParams, SamplingFunction } from '../../types/sampling'

/**
 * 最小值采样 - 保留每个桶中的最小值
 * @param data - 原始数据点数组
 * @param params - 采样参数
 * @param defaultMaxPoints - 默认最大点数
 * @returns 采样后的数据点数组
 */
export const useMinSampling: SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
): DataPoint[] => {
  const [, yDim] = params.dimensions || ['x', 'y']
  const targetSize = params.maxPoints || defaultMaxPoints

  if (data.length <= targetSize) return data

  const result: DataPoint[] = []
  const bucketSize = data.length / targetSize

  for (let i = 0; i < targetSize; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.floor((i + 1) * bucketSize)
    const bucket = data.slice(start, end)

    if (bucket.length === 0) continue

    let minPoint = bucket[0]
    for (const point of bucket) {
      if ((point[yDim] as number) < (minPoint[yDim] as number)) {
        minPoint = point
      }
    }
    result.push(minPoint)
  }

  return result
}

export default useMinSampling
