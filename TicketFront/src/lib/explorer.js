import { chain } from './wagmi'

// 블록 탐색기가 없는 로컬 체인에서는 null
export const txUrl = (hash) => {
  const base = chain.blockExplorers?.default?.url
  return base ? `${base}/tx/${hash}` : null
}

export const addressUrl = (address) => {
  const base = chain.blockExplorers?.default?.url
  return base && address ? `${base}/address/${address}` : null
}
