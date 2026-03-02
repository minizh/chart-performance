// 估算数据内存占用的实用函数
export function estimateMemoryUsage(
  data: number[],
  usingSVG: boolean = false
): number {
  const dataSize = data.length * data[0]?.toString()?.length * 8; // 假设每个数值8字节
  const styleSize = data.length * 100; // 每个点的样式信息约100字节
  const domSize = usingSVG ? data.length * 500 : 0; // SVG元素每个约500字节
  const totalMB = (dataSize + styleSize + domSize) / (1024 * 1024);
  console.log(`预估内存占用: ${totalMB.toFixed(2)} MB`);
  return  parseInt(totalMB.toFixed(2));
}
