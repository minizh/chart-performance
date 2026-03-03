<template>
  <div ref="chartRef" class="chart"></div>
</template>

<script setup lang="ts">
import { useTemplateRef, shallowRef, onMounted, watch, nextTick, ref, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useChartOptions } from '../composables/useChartOptions'
import { estimateMemoryUsage } from '../composables/estimateMemoryUsage'
import { useChartResizeObserver } from '../composables/useChartResizeObserver'
import { useDataGeneratorWorker } from '../composables/useDataGeneratorWorker'
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

// 使用 Web Worker 生成数据
const { generateNumbers, terminate } = useDataGeneratorWorker()

// 渲染状态
const isRendering = ref(false)

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    updateChart()
  }
}

// 让出主线程
const yieldMainThread = (): Promise<void> => {
  return new Promise(resolve => {
    if ('scheduler' in globalThis && 'yield' in (globalThis as any).scheduler) {
      ;(globalThis as any).scheduler.yield().then(resolve)
    } else {
      requestAnimationFrame(() => resolve())
    }
  })
}

// 更新图表
const updateChart = async () => {
  if (!chartInstance.value || isRendering.value) {
    return
  }
  
  isRendering.value = true
  const startTime = performance.now()
  
  // 提前声明所有变量
  let dataPoints = 0
  let memoryUsage = 0
  let samplingStats: SamplingResultStats | null = null
  
  try {
    // 使用 Web Worker 异步生成数据，不阻塞主线程
    const { data: rawData, categories: rawCategories } = await generateNumbers(props.dataSize)
    
    // 让出主线程，允许浏览器渲染
    await yieldMainThread()
    
    // 应用自定义采样（如果启用）
    const customSamplingConfig = getCustomSamplingConfig()
    let data = rawData
    let categories = rawCategories
    
    if (customSamplingConfig.enabled) {
      const samplingResult = applyCustomSamplingToNumbers(rawData, rawCategories)
      data = samplingResult.values
      categories = samplingResult.categories || rawCategories
      
      samplingStats = {
        samplingTime: samplingResult.stats?.samplingTime || 0,
        originalCount: samplingResult.originalCount,
        sampledCount: samplingResult.sampledCount,
        compressionRatio: samplingResult.originalCount > 0 
          ? samplingResult.sampledCount / samplingResult.originalCount 
          : 1
      }
      
      await yieldMainThread()
    }
    
    dataPoints = data.length
    memoryUsage = estimateMemoryUsage(data)
    
    // 获取通用配置
    const { baseOptions, baseSeriesOptions } = useChartOptions(props.optimizationOptions)
    
    // 组件定制化配置
    const option: echarts.EChartsOption = {
      ...baseOptions,
      title: {
        text: '折线图',
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
        type: 'line',
        ...baseSeriesOptions
      }]
    }
    
    // 定义渲染完成回调
    const onRenderFinished = () => {
      const endTime = performance.now()
      const renderTime = Math.round(endTime - startTime)
      
      emit('render-complete', dataPoints, renderTime, memoryUsage, samplingStats)
      chartInstance.value?.off('rendered', onRenderFinished)
      isRendering.value = false
    }
    
    // 监听渲染完成事件
    chartInstance.value.on('rendered', onRenderFinished)
    
    // 使用 requestAnimationFrame 让出主线程后再执行 setOption
    requestAnimationFrame(() => {
      chartInstance.value?.setOption(option, true)
    })
    
  } catch (error) {
    console.error('Chart update error:', error)
    const endTime = performance.now()
    const renderTime = Math.round(endTime - startTime)
    emit('render-complete', dataPoints, renderTime, memoryUsage, samplingStats)
    isRendering.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  initChart()
})

onUnmounted(() => {
  terminate()
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
