import { createConfig, http } from 'wagmi'
import { foundry, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const env = import.meta.env

export const chain = env.VITE_CHAIN === 'sepolia' ? sepolia : foundry

export const TICKET_ADDRESS = env.VITE_TICKET_ADDRESS
export const DEPLOY_BLOCK = BigInt(env.VITE_DEPLOY_BLOCK || 0)

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: { [chain.id]: http(env.VITE_RPC_URL || undefined) },
})
