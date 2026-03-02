import type { DataPoint, SamplingParams, SamplingFunction } from '../../types/sampling'

/**
 * LTTB (Largest Triangle Three Buckets) 采样
 * 保留数据视觉特征的降采样算法
 * @param data - 原始数据点数组
 * @param params - 采样参数
 * @param defaultMaxPoints - 默认最大点数
 * @returns 采样后的数据点数组
 */
export const useLTTBSampling: SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
): DataPoint[] => {
  const [xDim, yDim] = params.dimensions || ['x', 'y']
  const targetSize = params.maxPoints || defaultMaxPoints

  if (data.length <= targetSize) return data
  if (targetSize < 3) throw new Error('LTTB requires at least 3 points')

  const result: DataPoint[] = []

  // 始终包含第一个点
  result.push(data[0])

  const bucketSize = (data.length - 2) / (targetSize - 2)

  for (let i = 0; i < targetSize - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1
    const bucketEnd = Math.floor((i + 2) * bucketSize) + 1
    const bucket = data.slice(bucketStart, bucketEnd)

    if (bucket.length === 0) continue

    // 计算当前桶的平均点
    const avgX = bucket.reduce((sum, p) => sum + (p[xDim] as number), 0) / bucket.length
    const avgY = bucket.reduce((sum, p) => sum + (p[yDim] as number), 0) / bucket.length

    // 找到与前一个点和平均点形成最大三角形的点
    let maxArea = -1
    let maxIndex = 0
    const prevPoint = result[result.length - 1]

    for (let j = 0; j < bucket.length; j++) {
      const point = bucket[j]
      const area = Math.abs(
        ((prevPoint[xDim] as number) - avgX) * ((point[yDim] as number) - avgY) -
          ((prevPoint[yDim] as number) - avgY) * ((point[xDim] as number) - avgX)
      )

      if (area > maxArea) {
        maxArea = area
        maxIndex = j
      }
    }

    result.push(bucket[maxIndex])
  }

  // 始终包含最后一个点
  result.push(data[data.length - 1])

  return result
}

export default useLTTBSampling
