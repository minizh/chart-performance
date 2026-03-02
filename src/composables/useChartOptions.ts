import type * as echarts from 'echarts'

export interface OptimizationOptions {
  large: boolean
  progressive: boolean
  animation: boolean
  sampling: 'none' | 'lttb' | 'average' | 'min' | 'max' | 'minmax' | 'sum'
}

export function useChartOptions(optimizationOptions: OptimizationOptions) {
  // 通用配置
  const baseOptions: echarts.EChartsOption = {
    // 动画配置
    animation: optimizationOptions.animation,
    animationDuration: 500,
    // 数据缩放
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100
      }
    ]
  }

  // 通用系列配置
  const baseSeriesOptions = {
    // 大数据优化
    large: optimizationOptions.large,
    // 渐进式渲染
    ...(optimizationOptions.progressive && {
      progressive: 100,
      progressiveThreshold: 1000,
      progressiveChunkMode: 'seqeentialial'
    }),
    // 采样策略
    sampling: optimizationOptions.sampling !== 'none' ? optimizationOptions.sampling : undefined
  }

  return {
    baseOptions,
    baseSeriesOptions
  }
}
