import { createConfig, http } from 'wagmi'
import { createPublicClient } from 'viem'
import { baseSepolia, foundry, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const env = import.meta.env

const CHAINS = { sepolia, 'base-sepolia': baseSepolia }

export const chain = CHAINS[env.VITE_CHAIN] ?? foundry

export const TICKET_ADDRESS = env.VITE_TICKET_ADDRESS
export const DEPLOY_BLOCK = BigInt(env.VITE_DEPLOY_BLOCK || 0)

// 로그(getLogs) 조회는 RPC마다 허용 범위가 매우 다르다. (Alchemy 무료 10블록, 공개 RPC 수백~수만 블록)
// 배포 블록부터 한 번에 읽는 조회는 범위가 큰 RPC가 필요하므로, 로그 전용 RPC를 따로 둘 수 있게 한다.
// 비워 두면 VITE_RPC_URL(wagmi 클라이언트)을 그대로 쓴다.
export const logsClient = env.VITE_LOGS_RPC_URL
  ? createPublicClient({ chain, transport: http(env.VITE_LOGS_RPC_URL) })
  : null

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: { [chain.id]: http(env.VITE_RPC_URL || undefined) },
})
