<template>
  <div ref="chartRef" class="chart"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { estimateMemoryUsage } from '../composables/estimateMemoryUsage'
import { useChartOptions } from '../composables/useChartOptions'
import { useChartResizeObserver } from '../composables/useChartResizeObserver'
import { applyCustomSampling, getCustomSamplingConfig, type DataPoint, type SamplingResultStats } from '../composables/useCustomSampling'

const props = defineProps<{
  dataSize: number
  optimizationOptions: {
    large: boolean
    progressive: boolean
    animation: boolean
    sampling: 'none' | 'lttb' | 'average' | 'min' | 'max' | 'minmax' | 'sum'
  }
}>()

const emit = defineEmits<{
  (e: 'render-complete', 
    dataPoints: number, 
    renderTime: number, 
    memoryUsage: number,
    samplingStats?: SamplingResultStats | null
  ): void
}>()

const chartRef = useTemplateRef<HTMLElement>('chartRef')
const chartInstance = shallowRef<echarts.ECharts | null>(null)

// 使用 ResizeObserver 监听容器大小变化
useChartResizeObserver(chartRef, chartInstance)

// 生成散点图数据
const generateScatterData = (size: number): [number, number][] => {
  const data: [number, number][] = []
  
  for (let i = 0; i < size; i++) {
    data.push([Math.random() * 1000, Math.random() * 1000])
  }
  
  return data
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    updateChart()
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance.value) {
    console.warn('Chart instance not ready')
    return
  }
  
  const startTime = performance.now()
  let dataPoints = 0
  let memoryUsage = 0
  let samplingStats: SamplingResultStats | null = null
  
  // 用于记录渲染完成的回调函数
  const onRenderFinished = () => {
    const endTime = performance.now()
    const renderTime = Math.round(endTime - startTime)
    
    // 触发渲染完成事件
    emit('render-complete', dataPoints, renderTime, memoryUsage, samplingStats)
    
    // 移除一次性监听
    chartInstance.value?.off('finished', onRenderFinished)
  }
  
  try {
    // 生成原始数据
    const rawData = generateScatterData(props.dataSize)
    
    // 应用自定义采样（如果启用）
    const customSamplingConfig = getCustomSamplingConfig()
    let data: [number, number][] = rawData
    
    if (customSamplingConfig.enabled) {
      const samplingResult = applyCustomSampling(rawData, (item: [number, number]): DataPoint => ({
        x: item[0],
        y: item[1]
      }))
      data = samplingResult.data as [number, number][]
      
      // 构建采样统计
      samplingStats = {
        samplingTime: samplingResult.stats?.samplingTime || 0,
        originalCount: samplingResult.originalCount,
        sampledCount: samplingResult.sampledCount,
        compressionRatio: samplingResult.originalCount > 0 
          ? samplingResult.sampledCount / samplingResult.originalCount 
          : 1
      }
    }
    
    // 实际渲染的数据点数（采样后）
    dataPoints = data.length
    
    // 获取通用配置
    const { baseOptions, baseSeriesOptions } = useChartOptions(props.optimizationOptions)
    
    // 组件定制化配置 - 散点图需要特殊的dataZoom配置
    const option: echarts.EChartsOption = {
      ...baseOptions,
      title: {
        text: '散点图',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          xAxisIndex: 0
        },
        {
          type: 'inside',
          start: 0,
          end: 100,
          yAxisIndex: 0
        },
        {
          start: 0,
          end: 100,
          xAxisIndex: 0
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          yAxisIndex: 0,
          orient: 'vertical',
          right: 10
        }
      ],
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data,
        type: 'scatter',
        ...baseSeriesOptions
      }]
    }
    
    // 监听渲染完成事件（在 setOption 之前绑定）
    chartInstance.value.on('finished', onRenderFinished)
    
    // 设置图表选项
    chartInstance.value.setOption(option, true)
    
    // 计算预估内存占用（使用扁平化后的数据）
    memoryUsage = estimateMemoryUsage(data.flat())
    
  } catch (error) {
    console.error('Chart update error:', error)
    // 发生错误时立即触发完成事件
    const endTime = performance.now()
    const renderTime = Math.round(endTime - startTime)
    emit('render-complete', dataPoints, renderTime, memoryUsage, samplingStats)
  }
}

// 生命周期钩子
onMounted(() => {
  initChart()
})

// 监听属性变化
watch(
  () => [props.dataSize, props.optimizationOptions],
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)
</script>

<style scoped>
.chart {
  width: 100%;
  height: 100%;
}
</style>
