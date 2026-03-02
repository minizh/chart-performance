<template>
  <div ref="chartRef" class="chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useChartOptions } from '../composables/useChartOptions'
import { estimateMemoryUsage } from '../composables/estimateMemoryUsage'
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

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 生成箱线图数据
const generateBoxData = (size: number): number[][] => {
  const data: number[][] = []
  const actualSize = Math.min(size, 1000) // 限制箱线图数据量
  
  for (let i = 0; i < actualSize; i++) {
    const boxData: number[] = []
    for (let j = 0; j < 100; j++) {
      boxData.push(Math.random() * 1000)
    }
    data.push(boxData)
  }
  
  return data
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    updateChart()
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) {
    console.warn('Chart instance not ready')
    return
  }
  
  const startTime = performance.now()
  let dataPoints = 0
  let renderTime = 0
  let memoryUsage = 0
  let samplingStats: SamplingResultStats | null = null
  
  try {
    // 生成原始数据
    const rawData = generateBoxData(props.dataSize)
    const categories = Array.from({ length: rawData.length }, (_, i) => `Group ${i + 1}`)
    
    // 应用自定义采样（如果启用）
    const customSamplingConfig = getCustomSamplingConfig()
    let data: number[][] = rawData
    let sampledCategories: string[] = categories
    
    if (customSamplingConfig.enabled) {
      // 对箱线图数据使用平均值作为采样依据
      const samplingResult = applyCustomSampling(
        rawData,
        (item: number[], index: number): DataPoint => ({
          x: index,
          y: item.reduce((sum, val) => sum + val, 0) / item.length
        })
      )
      data = samplingResult.data
      // 根据采样结果筛选对应的类别标签
      const indices = rawData.map((_, i) => i).filter(i => 
        samplingResult.data.some(d => d === rawData[i])
      )
      sampledCategories = indices.map(i => categories[i])
      
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
    
    // 实际渲染的数据点数（箱线图每个数据包含100个值）
    dataPoints = data.length * 100
    
    // 获取通用配置
    const { baseOptions, baseSeriesOptions } = useChartOptions(props.optimizationOptions)
    
    // 组件定制化配置
    const option: echarts.EChartsOption = {
      ...baseOptions,
      title: {
        text: '箱线图',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      xAxis: {
        type: 'category',
        data: sampledCategories,
        axisLabel: {
          show: false
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        data,
        type: 'boxplot',
        ...baseSeriesOptions
      }]
    }
    
    // 设置图表选项
    chartInstance.setOption(option, true)
    
    // 计算预估内存占用（使用扁平化后的数据）
    const flatData = data.flat()
    memoryUsage = estimateMemoryUsage(flatData.length > 0 ? flatData : [0])
    
  } catch (error) {
    console.error('Chart update error:', error)
  } finally {
    // 计算渲染时间（包括错误情况）
    const endTime = performance.now()
    renderTime = Math.round(endTime - startTime)
    
    // 触发渲染完成事件，包含采样统计
    emit('render-complete', dataPoints, renderTime, memoryUsage, samplingStats)
  }
}

// 响应式调整图表大小
const handleResize = () => {
  chartInstance?.resize()
}

// 生命周期钩子
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
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
