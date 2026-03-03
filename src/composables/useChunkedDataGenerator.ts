import { ref } from 'vue'

/**
 * 分块数据生成选项
 */
export interface ChunkedGeneratorOptions {
  /** 每块数据量 */
  chunkSize?: number
  /** 每块生成后的延迟（ms） */
  delay?: number
}

/**
 * 分块数据生成器状态
 */
export interface GeneratorState {
  isGenerating: boolean
  progress: number
  generatedCount: number
}

/**
 * 使用分块方式生成大量数据，避免阻塞主线程
 * @param options - 配置选项
 */
export function useChunkedDataGenerator(options: ChunkedGeneratorOptions = {}) {
  const { chunkSize = 10000 } = options
  
  const state = ref<GeneratorState>({
    isGenerating: false,
    progress: 0,
    generatedCount: 0
  })
  
  /**
   * 分块生成数值数据
   * @param totalSize - 总数据量
   * @param onChunk - 每块生成后的回调
   */
  const generateNumbers = async (
    totalSize: number,
    onChunk?: (data: number[], categories: string[], progress: number) => void | Promise<void>
  ): Promise<{ data: number[]; categories: string[] }> => {
    const data: number[] = []
    const categories: string[] = []
    
    state.value.isGenerating = true
    state.value.progress = 0
    state.value.generatedCount = 0
    
    const chunks = Math.ceil(totalSize / chunkSize)
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize
      const end = Math.min((i + 1) * chunkSize, totalSize)
      
      // 生成一块数据
      for (let j = start; j < end; j++) {
        data.push(Math.random() * 1000)
        categories.push(`Item ${j + 1}`)
      }
      
      state.value.generatedCount = data.length
      state.value.progress = Math.round((data.length / totalSize) * 100)
      
      // 回调通知进度
      if (onChunk) {
        await onChunk(data.slice(start, end), categories.slice(start, end), state.value.progress)
      }
      
      // 让出主线程，允许渲染
      if (i < chunks - 1) {
        await yieldMainThread()
      }
    }
    
    state.value.isGenerating = false
    return { data, categories }
  }
  
  /**
   * 分块生成散点图数据
   * @param totalSize - 总数据量
   * @param onChunk - 每块生成后的回调
   */
  const generateScatterData = async (
    totalSize: number,
    onChunk?: (data: [number, number][], progress: number) => void | Promise<void>
  ): Promise<[number, number][]> => {
    const data: [number, number][] = []
    
    state.value.isGenerating = true
    state.value.progress = 0
    state.value.generatedCount = 0
    
    const chunks = Math.ceil(totalSize / chunkSize)
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize
      const end = Math.min((i + 1) * chunkSize, totalSize)
      
      // 生成一块数据
      for (let j = start; j < end; j++) {
        data.push([Math.random() * 1000, Math.random() * 1000])
      }
      
      state.value.generatedCount = data.length
      state.value.progress = Math.round((data.length / totalSize) * 100)
      
      // 回调通知进度
      if (onChunk) {
        await onChunk(data.slice(start, end), state.value.progress)
      }
      
      // 让出主线程
      if (i < chunks - 1) {
        await yieldMainThread()
      }
    }
    
    state.value.isGenerating = false
    return data
  }
  
  /**
   * 让出主线程，允许浏览器进行渲染
   */
  const yieldMainThread = (): Promise<void> => {
    return new Promise(resolve => {
      // 优先使用 scheduler.yield()（Chrome 96+）
      if ('scheduler' in globalThis && 'yield' in (globalThis as any).scheduler) {
        ;(globalThis as any).scheduler.yield().then(resolve)
      } else {
        // 降级使用 requestAnimationFrame
        requestAnimationFrame(() => resolve())
      }
    })
  }
  
  return {
    state,
    generateNumbers,
    generateScatterData,
    yieldMainThread
  }
}

export default useChunkedDataGenerator
