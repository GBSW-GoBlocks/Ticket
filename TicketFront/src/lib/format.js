import { formatEther } from 'viem'

export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')
export const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

// ETH 표기 통일: 천 단위 쉼표, 소수 최대 6자리, 너무 작은 값은 "<0.000001"
export function formatEth(wei) {
  if (wei === undefined || wei === null) return '…'
  const [int, frac = ''] = formatEther(wei).split('.')
  const head = frac.slice(0, 6)
  if (wei > 0n && int === '0' && !/[1-9]/.test(head)) return '<0.000001'
  const trimmed = head.replace(/0+$/, '')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

// URL의 id는 숫자 문자열만 허용 (1e0, 0x1, abc 거부)
export const parseId = (v) => (/^\d+$/.test(v ?? '') ? v : null)
