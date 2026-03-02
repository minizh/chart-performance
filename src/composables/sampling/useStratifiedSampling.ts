import type { DataPoint, SamplingParams, SamplingFunction } from '../../types/sampling'

/**
 * 分层采样 - 将数据分成若干层，每层按比例采样
 * @param data - 原始数据点数组
 * @param params - 采样参数
 * @param defaultMaxPoints - 默认最大点数
 * @returns 采样后的数据点数组
 */
export const useStratifiedSampling: SamplingFunction = (
  data: DataPoint[],
  params: SamplingParams,
  defaultMaxPoints: number
): DataPoint[] => {
  const targetSize = params.maxPoints || defaultMaxPoints
  if (data.length <= targetSize) return data

  const layers = Math.ceil(Math.sqrt(targetSize))
  const layerSize = Math.ceil(data.length / layers)

  const result: DataPoint[] = []
  const pointsPerLayer = Math.ceil(targetSize / layers)

  for (let i = 0; i < layers; i++) {
    const start = i * layerSize
    const end = Math.min((i + 1) * layerSize, data.length)
    const layer = data.slice(start, end)

    if (layer.length <= pointsPerLayer) {
      result.push(...layer)
    } else {
      // 在每层内进行均匀采样
      const step = layer.length / pointsPerLayer
      for (let j = 0; j < pointsPerLayer; j++) {
        const index = Math.floor(j * step)
        result.push(layer[index])
      }
    }
  }

  return result
}

export default useStratifiedSampling
