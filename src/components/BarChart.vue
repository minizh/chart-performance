<template>
  <div ref="chartRef" class="chart"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { estimateMemoryUsage } from '../composables/estimateMemoryUsage'
import { useChartOptions } from '../composables/useChartOptions'
import { useChartResizeObserver } from '../composables/useChartResizeObserver'
import { applyCustomSamplingToNumbers, getCustomSamplingConfig, type SamplingResultStats } from '../composables/useCustomSampling'

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

// 生成数据
const generateData = (size: number) => {
  const data: number[] = []
  const categories: string[] = []
  
  for (let i = 0; i < size; i++) {
    data.push(Math.random() * 1000)
    categories.push(`Item ${i + 1}`)
  }
  
  return { data, categories }
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
    const { data: rawData, categories: rawCategories } = generateData(props.dataSize)
    
    // 应用自定义采样（如果启用）
    const customSamplingConfig = getCustomSamplingConfig()
    let data = rawData
    let categories = rawCategories
    
    if (customSamplingConfig.enabled) {
      const samplingResult = applyCustomSamplingToNumbers(rawData, rawCategories)
      data = samplingResult.values
      categories = samplingResult.categories || rawCategories
      
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
    
    // 组件定制化配置
    const option: echarts.EChartsOption = {
      ...baseOptions,
      title: {
        text: '柱状图',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          show: false
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data,
        type: 'bar',
        ...baseSeriesOptions
      }]
    }
    
    // 监听渲染完成事件（在 setOption 之前绑定）
    chartInstance.value.on('finished', onRenderFinished)
    
    // 设置图表选项
    chartInstance.value.setOption(option, true)
    
    // 计算预估内存占用
    memoryUsage = estimateMemoryUsage(data)
    
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
