import { ref } from 'vue'
import type { WorkerMessage, WorkerResponse } from '../workers/dataGenerator.worker'

/**
 * Worker 生成器状态
 */
export interface WorkerGeneratorState {
  isGenerating: boolean
  progress: number
  generatedCount: number
}

/**
 * 使用 Web Worker 生成数据，完全避免阻塞主线程
 */
export function useDataGeneratorWorker() {
  const state = ref<WorkerGeneratorState>({
    isGenerating: false,
    progress: 0,
    generatedCount: 0
  })
  
  let worker: Worker | null = null
  
  /**
   * 获取或创建 Worker 实例
   */
  const getWorker = (): Worker => {
    if (!worker) {
      // Vite 支持直接导入 worker 文件
      worker = new Worker(
        new URL('../workers/dataGenerator.worker.ts', import.meta.url),
        { type: 'module' }
      )
    }
    return worker
  }
  
  /**
   * 终止 Worker
   */
  const terminate = () => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  }
  
  /**
   * 生成数值数据
   */
  const generateNumbers = (
    size: number,
    onProgress?: (progress: number) => void
  ): Promise<{ data: number[]; categories: string[] }> => {
    return new Promise((resolve, reject) => {
      const worker = getWorker()
      const data: number[] = []
      const categories: string[] = []
      
      state.value.isGenerating = true
      state.value.progress = 0
      state.value.generatedCount = 0
      
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, payload } = event.data
        
        switch (type) {
          case 'chunk':
            if (payload?.data && payload?.categories) {
              data.push(...payload.data)
              categories.push(...payload.categories)
              state.value.generatedCount = data.length
              state.value.progress = payload.progress || 0
              onProgress?.(state.value.progress)
            }
            break
            
          case 'complete':
            state.value.isGenerating = false
            resolve({ data, categories })
            break
            
          case 'error':
            state.value.isGenerating = false
            reject(new Error(payload?.error || 'Worker error'))
            break
        }
      }
      
      worker.onerror = (error) => {
        state.value.isGenerating = false
        reject(error)
      }
      
      const message: WorkerMessage = {
        type: 'generate',
        payload: { size, chunkSize: 25000 }
      }
      
      worker.postMessage(message)
    })
  }
  
  /**
   * 生成散点图数据
   */
  const generateScatterData = (
    size: number,
    onProgress?: (progress: number) => void
  ): Promise<[number, number][]> => {
    return new Promise((resolve, reject) => {
      const worker = getWorker()
      const data: [number, number][] = []
      
      state.value.isGenerating = true
      state.value.progress = 0
      state.value.generatedCount = 0
      
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, payload } = event.data
        
        switch (type) {
          case 'chunk':
            if (payload?.scatterData) {
              data.push(...payload.scatterData)
              state.value.generatedCount = data.length
              state.value.progress = payload.progress || 0
              onProgress?.(state.value.progress)
            }
            break
            
          case 'complete':
            state.value.isGenerating = false
            resolve(data)
            break
            
          case 'error':
            state.value.isGenerating = false
            reject(new Error(payload?.error || 'Worker error'))
            break
        }
      }
      
      worker.onerror = (error) => {
        state.value.isGenerating = false
        reject(error)
      }
      
      const message: WorkerMessage = {
        type: 'generate-scatter',
        payload: { size, chunkSize: 25000 }
      }
      
      worker.postMessage(message)
    })
  }
  
  /**
   * 生成箱线图数据
   */
  const generateBoxData = (
    size: number,
    onProgress?: (progress: number) => void
  ): Promise<number[][]> => {
    return new Promise((resolve, reject) => {
      const worker = getWorker()
      const data: number[][] = []
      
      state.value.isGenerating = true
      state.value.progress = 0
      state.value.generatedCount = 0
      
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, payload } = event.data
        
        switch (type) {
          case 'chunk':
            if (payload?.boxData) {
              data.push(...payload.boxData)
              state.value.generatedCount = data.length
              state.value.progress = payload.progress || 0
              onProgress?.(state.value.progress)
            }
            break
            
          case 'complete':
            state.value.isGenerating = false
            resolve(data)
            break
            
          case 'error':
            state.value.isGenerating = false
            reject(new Error(payload?.error || 'Worker error'))
            break
        }
      }
      
      worker.onerror = (error) => {
        state.value.isGenerating = false
        reject(error)
      }
      
      const message: WorkerMessage = {
        type: 'generate-box',
        payload: { size, chunkSize: 1000 }
      }
      
      worker.postMessage(message)
    })
  }
  
  return {
    state,
    generateNumbers,
    generateScatterData,
    generateBoxData,
    terminate
  }
}

export default useDataGeneratorWorker
