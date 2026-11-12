import { useConnect } from 'wagmi'
import { useToast } from '../lib/toast'
import { friendlyError } from '../lib/errors'
import { hasWallet, NO_WALLET } from '../lib/wallet'

// 지갑 연결 버튼. 헤더와 "지갑을 연결하면 …" 안내 화면이 같은 동작·같은 문구를 쓴다.
export default function ConnectButton({ className = 'btn' }) {
  const { connect, connectors, isPending } = useConnect()
  const toast = useToast()
  const onClick = () => {
    toast.clearErrors()
    if (!hasWallet() || !connectors[0]) {
      toast.push({ kind: 'error', text: NO_WALLET })
      return
    }
    connect({ connector: connectors[0] }, { onError: (e) => toast.push({ kind: 'error', text: `지갑 연결: ${friendlyError(e)}` }) })
  }
  return <button className={className} disabled={isPending} onClick={onClick}>{isPending ? '연결하는 중…' : '지갑 연결'}</button>
}
