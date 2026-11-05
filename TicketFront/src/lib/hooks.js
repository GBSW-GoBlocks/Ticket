import { useRef, useState } from 'react'
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketAbi } from './ticketAbi'
import { TICKET_ADDRESS, chain } from './wagmi'
import { friendlyError } from './errors'
import { txUrl } from './explorer'
import { useToast } from './toast'
import { loadEvents, loadTickets, loadSellerRequests, loadActivity } from './api'

// 30초 동안 신선하게 두고, 보이는 탭에서는 15초마다 갱신한다. (다른 사용자의 구매 반영)
const LIVE = { staleTime: 30_000, refetchInterval: 15_000, refetchOnWindowFocus: false }
// 컨트랙트 직접 읽기(역할·정산·신청 상태)도 같은 주기로 갱신한다. (다른 계정의 승인·거래 반영)
export const LIVE_READ = { refetchInterval: 15_000, refetchOnWindowFocus: false }

export function useEvents() {
  const client = usePublicClient()
  return useQuery({ queryKey: ['events'], queryFn: () => loadEvents(client), ...LIVE })
}

export function useTickets() {
  const client = usePublicClient()
  return useQuery({ queryKey: ['tickets'], queryFn: () => loadTickets(client), ...LIVE })
}

export function useSellerRequests(enabled) {
  const client = usePublicClient()
  return useQuery({ queryKey: ['requests'], queryFn: () => loadSellerRequests(client), enabled, ...LIVE })
}

export function useActivity(address) {
  const client = usePublicClient()
  return useQuery({ queryKey: ['activity', address], queryFn: () => loadActivity(client, address), enabled: !!address, ...LIVE })
}

// 'owner' | 'seller' | 'user' | undefined(미연결)
export function useRole() {
  const { address } = useAccount()
  const { data } = useReadContract({
    address: TICKET_ADDRESS,
    abi: ticketAbi,
    functionName: 'checkMyAuth',
    account: address,
    query: { enabled: !!address, ...LIVE_READ },
  })
  return address ? data : undefined
}

export function useWrongChain() {
  const { chainId, isConnected } = useAccount()
  return isConnected && chainId !== chain.id
}

// 관람 가능 여부 판단에 쓰는 공통 컨텍스트
export function useWalletContext() {
  const { address } = useAccount()
  const role = useRole()
  const wrongChain = useWrongChain()
  return { address, role, wrongChain }
}

// 쓰기 트랜잭션 공통 훅: 서명 전 시뮬레이션 → 서명 대기 → 블록 기록 → 확정/실패를 알림으로 보여준다.
// 락은 ref로 걸어 같은 틱의 연타도 막는다.
export function useTx() {
  const { writeContractAsync } = useWriteContract()
  const { address } = useAccount()
  const client = usePublicClient()
  const qc = useQueryClient()
  const toast = useToast()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)

  const refresh = () =>
    qc.invalidateQueries({
      predicate: (q) => ['events', 'tickets', 'requests', 'activity', 'readContract', 'balance'].includes(q.queryKey[0]),
    })

  // 눌렀던 버튼이 사라져(환불·구매 등) 포커스가 문서 맨 위로 떨어지면 화면 제목으로 옮긴다.
  const restoreFocus = () =>
    requestAnimationFrame(() => {
      const a = document.activeElement
      if (a && a !== document.body && document.contains(a)) return
      const h1 = document.querySelector('main h1')
      if (!h1) return
      h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: true })
    })

  const send = async (functionName, args = [], value, label = '트랜잭션', opts = {}) => {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    toast.clearErrors() // 새 요청이 시작되면 이전 오류는 지운다.
    const id = toast.push({ kind: 'info', text: `${label}: 확인하는 중입니다…`, sticky: true })
    try {
      const call = { address: TICKET_ADDRESS, abi: ticketAbi, functionName, args, value }
      // 실패할 거래는 서명(가스 소모) 전에 사유를 보여준다.
      await client.simulateContract({ ...call, account: address })
      toast.update(id, { text: `${label}: 지갑에서 서명해주세요.` })
      const hash = await writeContractAsync(call)
      toast.update(id, { text: `${label}: 블록에 기록되는 중입니다…`, link: txUrl(hash) })
      const receipt = await client.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') {
        throw new Error('처리되지 않았습니다. 최신 상태를 확인한 뒤 다시 시도해주세요. 가스비가 청구되었을 수 있습니다.')
      }
      await refresh()
      toast.update(id, { kind: 'ok', text: `${label}: 완료되었습니다.`, sticky: false, action: opts.action })
      restoreFocus()
      return true
    } catch (e) {
      // 실패해도 화면이 오래된 데이터일 수 있으니(이미 팔린 티켓 등) 목록을 바로 다시 읽는다.
      refresh()
      toast.update(id, { kind: 'error', text: `${label}: ${friendlyError(e)}`, sticky: true, link: null })
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { send, busy }
}
