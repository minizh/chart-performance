import { onMounted, onUnmounted, watch, type Ref, type ShallowRef } from 'vue'

/**
 * ECharts 实例接口（简化版）
 */
interface EChartsInstance {
  resize: () => void
  off: (event: string, handler?: Function) => void
}

/**
 * 使用 ResizeObserver 监听图表容器大小变化
 * @param chartRef - 图表容器 HTMLElement ref
 * @param chartInstance - ECharts 实例 ref
 */
export function useChartResizeObserver(
  chartRef: Ref<HTMLElement | undefined> | ShallowRef<HTMLElement | null>,
  chartInstance: Ref<EChartsInstance | null> | ShallowRef<EChartsInstance | null>
) {
  let resizeObserver: ResizeObserver | null = null

  const observe = () => {
    // 确保两者都已就绪
    if (!chartRef.value || !chartInstance.value) {
      return
    }

    // 如果已经有 observer，先断开
    if (resizeObserver) {
      resizeObserver.disconnect()
    }

    // 创建 ResizeObserver 实例
    resizeObserver = new ResizeObserver((entries) => {
      // 使用 requestAnimationFrame 避免频繁触发
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          // 只有当尺寸大于 0 时才触发 resize
          if (width > 0 && height > 0) {
            chartInstance.value?.resize()
          }
        }
      })
    })

    // 开始监听
    resizeObserver.observe(chartRef.value)
  }

  const unobserve = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  // 在组件挂载后开始观察
  onMounted(() => {
    // 如果 chartInstance 已经存在，直接观察
    if (chartRef.value && chartInstance.value) {
      observe()
    }
  })

  // 监听 chartInstance 的变化，当图表实例创建后自动开始观察
  watch(
    () => chartInstance.value,
    (newVal) => {
      if (newVal && chartRef.value) {
        observe()
      }
    },
    { immediate: true }
  )

  // 组件卸载时清理
  onUnmounted(() => {
    unobserve()
  })

  return {
    observe,
    unobserve
  }
}

export default useChartResizeObserver
