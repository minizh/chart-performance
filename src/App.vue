<template>
  <div class="app">
    <el-container>
      <!-- 左侧配置面板 -->
      <el-aside width="320px" class="config-panel">
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>性能优化配置</span>
            </div>
          </template>

          <el-form :model="formConfig" label-position="top" size="small">
            <!-- 数据规模 - 使用数字输入框 -->
            <el-form-item label="数据规模">
              <el-input-number v-model="formConfig.dataSize" :min="100" :max="500000" :step="1000"
                :step-strictly="false" controls-position="right" style="width: 100%" />
            </el-form-item>

            <!-- 大数据模式 -->
            <el-form-item label="大数据优化 (large)">
              <el-switch v-model="formConfig.optimizationOptions.large" active-text="开启" inactive-text="关闭" />
            </el-form-item>

            <!-- 渐进式渲染 -->
            <el-form-item label="渐进式渲染 (progressive)">
              <el-switch v-model="formConfig.optimizationOptions.progressive" active-text="开启" inactive-text="关闭" />
            </el-form-item>

            <!-- 动画 -->
            <el-form-item label="动画效果 (animation)">
              <el-switch v-model="formConfig.optimizationOptions.animation" active-text="开启" inactive-text="关闭" />
            </el-form-item>

            <!-- ECharts 内置采样策略 -->
            <el-form-item label="ECharts 内置采样策略">
              <el-select v-model="formConfig.optimizationOptions.sampling" placeholder="选择采样策略" style="width: 100%"
                :disabled="formConfig.customSampling.enabled">
                <el-option label="不采样 (none)" value="none" />
                <el-option label="LTTB 采样 (lttb)" value="lttb" />
                <el-option label="平均值采样 (average)" value="average" />
                <el-option label="最小值采样 (min)" value="min" />
                <el-option label="最大值采样 (max)" value="max" />
                <el-option label="最大最小值采样 (minmax)" value="minmax" />
                <el-option label="求和采样 (sum)" value="sum" />
              </el-select>
            </el-form-item>

            <!-- 自定义采样策略 -->
            <el-divider content-position="left">自定义采样策略</el-divider>

            <el-form-item>
              <el-switch v-model="formConfig.customSampling.enabled" active-text="启用自定义采样"
                inactive-text="使用 ECharts 内置采样" />
            </el-form-item>

            <template v-if="formConfig.customSampling.enabled">
              <el-form-item label="自定义采样方法">
                <el-select v-model="formConfig.customSampling.method" placeholder="选择采样方法" style="width: 100%">
                  <el-option label="随机采样 (random)" value="random" />
                  <el-option label="分层采样 (stratified)" value="stratified" />
                  <el-option label="LTTB 采样 (lttb)" value="lttb" />
                  <el-option label="平均值采样 (average)" value="average" />
                  <el-option label="最小值采样 (min)" value="min" />
                  <el-option label="最大值采样 (max)" value="max" />
                  <el-option label="最大最小值采样 (minmax)" value="minmax" />
                  <el-option label="求和采样 (sum)" value="sum" />
                </el-select>
              </el-form-item>

              <el-form-item label="最大采样点数">
                <el-input-number v-model="formConfig.customSampling.maxPoints" :min="100" :max="50000" :step="500"
                  :step-strictly="false" controls-position="right" style="width: 100%" />
              </el-form-item>
            </template>
          </el-form>
        </el-card>

        <!-- 性能统计面板 -->
        <el-card class="box-card stats-card">
          <template #header>
            <div class="card-header">
              <span>性能统计</span>
            </div>
          </template>

          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-label">数据点数:</span>
              <span class="stat-value">{{ stats.dataPoints.toLocaleString() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">渲染时间:</span>
              <span class="stat-value" :class="getTimeClass(stats.renderTime)">
                {{ stats.renderTime }} ms
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预估内存:</span>
              <span class="stat-value">{{ stats.memoryUsage }} MB</span>
            </div>

            <!-- 自定义采样统计 -->
            <template v-if="formConfig.customSampling.enabled && currentSamplingStats">
              <el-divider />
              <div class="stat-section-title">自定义采样统计</div>
              <div class="stat-item">
                <span class="stat-label">采样耗时:</span>
                <span class="stat-value" :class="getTimeClass(currentSamplingStats.samplingTime)">
                  {{ currentSamplingStats.samplingTime.toFixed(2) }} ms
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">采样前数据量:</span>
                <span class="stat-value">{{ currentSamplingStats.originalCount.toLocaleString() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">采样后数据量:</span>
                <span class="stat-value">{{ currentSamplingStats.sampledCount.toLocaleString() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">压缩率:</span>
                <span class="stat-value">{{ (currentSamplingStats.compressionRatio * 100).toFixed(1) }}%</span>
              </div>
            </template>

            <!-- 未触发采样的提示 -->
            <template v-else-if="formConfig.customSampling.enabled && !currentSamplingStats">
              <el-divider />
              <div class="stat-item">
                <span class="stat-value" style="color: #909399; font-size: 12px;">
                  数据量未超过最大采样点数，未触发采样
                </span>
              </div>
            </template>
          </div>
        </el-card>
      </el-aside>

      <!-- 右侧图表区域 -->
      <el-main class="chart-container">
        <el-tabs v-model="activeChart" type="border-card">
          <el-tab-pane label="折线图" name="line">
          </el-tab-pane>
          <el-tab-pane label="柱状图" name="bar">
          </el-tab-pane>
          <el-tab-pane label="散点图" name="scatter">
          </el-tab-pane>
          <el-tab-pane label="箱线图" name="box">
          </el-tab-pane>
        </el-tabs>
        <section class="chartBox">
          <div v-if="activeChart === 'line'">
            <LineChart :key="chartKey" :data-size="formConfig.dataSize" :optimization-options="chartOptimizationOptions"
              @render-complete="onRenderComplete" />
          </div>
          <div v-if="activeChart === 'bar'">
            <BarChart :key="chartKey" :data-size="formConfig.dataSize" :optimization-options="chartOptimizationOptions"
              @render-complete="onRenderComplete" />
          </div>
          <div v-if="activeChart === 'scatter'">
            <ScatterChart :key="chartKey" :data-size="formConfig.dataSize"
              :optimization-options="chartOptimizationOptions" @render-complete="onRenderComplete" />
          </div>
          <div v-if="activeChart === 'box'">
            <BoxChart :key="chartKey" :data-size="formConfig.dataSize" :optimization-options="chartOptimizationOptions"
              @render-complete="onRenderComplete" />
          </div>
        </section>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import LineChart from './components/LineChart.vue'
import BarChart from './components/BarChart.vue'
import ScatterChart from './components/ScatterChart.vue'
import BoxChart from './components/BoxChart.vue'
import { setCustomSamplingConfig, type SamplingResultStats } from './composables/useCustomSampling'

// 当前激活的图表
const activeChart = ref('line')

// 图表刷新 key
const chartKey = ref(0)

// 表单配置
const formConfig = reactive({
  dataSize: 10000,
  optimizationOptions: {
    large: true,
    progressive: true,
    animation: false,
    sampling: 'none' as 'none' | 'lttb' | 'average' | 'min' | 'max' | 'minmax' | 'sum'
  },
  customSampling: {
    enabled: false,
    method: 'lttb' as const,
    maxPoints: 5000
  }
})

// 性能统计
const stats = reactive({
  dataPoints: 0,
  renderTime: 0,
  memoryUsage: 0
})

// 当前采样统计（从图表组件传递过来）
const currentSamplingStats = ref<SamplingResultStats | null>(null)

// 计算图表优化选项
const chartOptimizationOptions = computed(() => {
  // 如果启用了自定义采样，ECharts 内置采样设置为 none
  if (formConfig.customSampling.enabled) {
    return {
      ...formConfig.optimizationOptions,
      sampling: 'none' as const
    }
  }
  return formConfig.optimizationOptions
})

// 监听所有配置变化，触发图表刷新
watch(
  () => [
    formConfig.dataSize,
    formConfig.optimizationOptions.large,
    formConfig.optimizationOptions.progressive,
    formConfig.optimizationOptions.animation,
    formConfig.optimizationOptions.sampling,
    formConfig.customSampling.enabled,
    formConfig.customSampling.method,
    formConfig.customSampling.maxPoints
  ],
  () => {
    // 强制刷新图表
    chartKey.value++

    // 重置采样统计
    currentSamplingStats.value = null

    // 更新自定义采样配置
    setCustomSamplingConfig({
      enabled: formConfig.customSampling.enabled,
      method: formConfig.customSampling.method,
      maxPoints: formConfig.customSampling.maxPoints
    })
  },
  { deep: true }
)

// 处理渲染完成事件
const onRenderComplete = (
  dataPoints: number,
  renderTime: number,
  memoryUsage: number,
  samplingStats?: SamplingResultStats | null
) => {
  // 更新基本统计 - dataPoints 是实际渲染的点数（采样后）
  stats.dataPoints = dataPoints
  stats.renderTime = renderTime
  stats.memoryUsage = memoryUsage

  // 更新采样统计
  if (samplingStats) {
    currentSamplingStats.value = samplingStats
  }
}

// 根据时间获取样式类
const getTimeClass = (time: number): string => {
  if (time < 100) return 'time-good'
  if (time < 500) return 'time-medium'
  return 'time-bad'
}
</script>

<style scoped lang="less">
.app {
  height: 100vh;
  overflow: hidden;
}

.config-panel {
  padding: 16px;
  background-color: #f5f7fa;
  overflow-y: auto;
  height: 100vh;
}

.box-card {
  margin-bottom: 16px;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}

.slider-value {
  text-align: right;
  color: #606266;
  font-size: 12px;
  margin-top: 4px;
}

.stats-card {
  margin-top: 16px;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-section-title {
  font-weight: bold;
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #606266;
  font-size: 13px;
}

.stat-value {
  font-weight: bold;
  font-size: 14px;
  color: #303133;
}

.time-good {
  color: #67c23a;
}

.time-medium {
  color: #e6a23c;
}

.time-bad {
  color: #f56c6c;
}

.chart-container {
  padding: 16px;
  background-color: #fff;
  height: 100vh;
  overflow: hidden;

  .chartBox {
    height: 100%;

    >div {
      height: 100%;
    }
  }
}

// :deep(.el-tabs) {
//   height: 100%;
// }

:deep(.el-tabs__content) {
  /* height: calc(100% - 40px); */
  display: none;
}

// :deep(.el-tab-pane) {
//   height: 100%;
// }</style>
