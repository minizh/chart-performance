/**
 * Web Worker for data generation
 * Run in separate thread to avoid blocking main thread
 */

// Worker message types
export interface WorkerMessage {
  type: 'generate' | 'generate-scatter' | 'generate-box'
  payload: {
    size: number
    chunkSize?: number
  }
}

export interface WorkerResponse {
  type: 'chunk' | 'complete' | 'error'
  payload?: {
    data?: number[]
    categories?: string[]
    scatterData?: [number, number][]
    boxData?: number[][]
    progress?: number
    error?: string
  }
}

// Generate random numbers in chunks
const generateNumbers = (size: number, chunkSize: number = 20000): void => {
  const totalChunks = Math.ceil(size / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min((i + 1) * chunkSize, size)
    const chunkLength = end - start
    
    const data = new Array(chunkLength)
    const categories = new Array(chunkLength)
    
    for (let j = 0; j < chunkLength; j++) {
      data[j] = Math.random() * 1000
      categories[j] = `Item ${start + j + 1}`
    }
    
    // Send chunk back to main thread
    const response: WorkerResponse = {
      type: 'chunk',
      payload: {
        data,
        categories,
        progress: Math.round((end / size) * 100)
      }
    }
    
    self.postMessage(response)
  }
  
  // Notify completion
  const completeResponse: WorkerResponse = { type: 'complete' }
  self.postMessage(completeResponse)
}

// Generate scatter data in chunks
const generateScatterData = (size: number, chunkSize: number = 20000): void => {
  const totalChunks = Math.ceil(size / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min((i + 1) * chunkSize, size)
    const chunkLength = end - start
    
    const data: [number, number][] = new Array(chunkLength)
    
    for (let j = 0; j < chunkLength; j++) {
      data[j] = [Math.random() * 1000, Math.random() * 1000]
    }
    
    const response: WorkerResponse = {
      type: 'chunk',
      payload: {
        scatterData: data,
        progress: Math.round((end / size) * 100)
      }
    }
    
    self.postMessage(response)
  }
  
  self.postMessage({ type: 'complete' } as WorkerResponse)
}

// Generate box plot data in chunks
const generateBoxData = (size: number, chunkSize: number = 1000): void => {
  const actualSize = Math.max(size, 1000)
  const totalChunks = Math.ceil(actualSize / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min((i + 1) * chunkSize, actualSize)
    const chunkLength = end - start
    
    const data: number[][] = new Array(chunkLength)
    
    for (let j = 0; j < chunkLength; j++) {
      const boxData: number[] = new Array(100)
      for (let k = 0; k < 100; k++) {
        boxData[k] = Math.random() * 1000
      }
      data[j] = boxData
    }
    
    const response: WorkerResponse = {
      type: 'chunk',
      payload: {
        boxData: data,
        progress: Math.round((end / actualSize) * 100)
      }
    }
    
    self.postMessage(response)
  }
  
  self.postMessage({ type: 'complete' } as WorkerResponse)
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data
  
  try {
    switch (type) {
      case 'generate':
        generateNumbers(payload.size, payload.chunkSize)
        break
      case 'generate-scatter':
        generateScatterData(payload.size, payload.chunkSize)
        break
      case 'generate-box':
        generateBoxData(payload.size, payload.chunkSize)
        break
      default:
        self.postMessage({
          type: 'error',
          payload: { error: `Unknown message type: ${type}` }
        } as WorkerResponse)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: String(error) }
    } as WorkerResponse)
  }
}

export {}
