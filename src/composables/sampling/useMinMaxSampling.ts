import type { DataPoint, SamplingParams, SamplingFunction } from '../../types/sampling'

/**
 * Min-Max 采样 - 保留每个桶中的最小和最大值
 * @param data - 原始数据点数组
 * @param params - 采样参数
 * @param defaultMaxPoints - 默认最大点数
 * @returns 采样后的数据点数组
 */
export const useMinMaxSampling: SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
): DataPoint[] => {
  const [, yDim] = params.dimensions || ['x', 'y']
  const targetSize = params.maxPoints || defaultMaxPoints

  if (data.length <= targetSize) return data

  const result: DataPoint[] = []
  const bucketSize = Math.ceil(data.length / (targetSize / 2))

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize)
    if (bucket.length === 0) continue

    let minPoint = bucket[0]
    let maxPoint = bucket[0]

    for (const point of bucket) {
      if ((point[yDim] as number) < (minPoint[yDim] as number)) {
        minPoint = point
      }
      if ((point[yDim] as number) > (maxPoint[yDim] as number)) {
        maxPoint = point
      }
    }

    // 按原始顺序添加
    const minIndex = bucket.indexOf(minPoint)
    const maxIndex = bucket.indexOf(maxPoint)

    if (minIndex < maxIndex) {
      result.push(minPoint, maxPoint)
    } else {
      result.push(maxPoint, minPoint)
    }
  }

  return result.slice(0, targetSize)
}

export default useMinMaxSampling
