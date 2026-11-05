import { short } from '../lib/format'
import { useToast } from '../lib/toast'

export default function AddressText({ address, full = false }) {
  const toast = useToast()
  if (!address) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      toast.push({ kind: 'ok', text: '주소를 복사했습니다.' })
    } catch {
      toast.push({ kind: 'error', text: '복사하지 못했습니다. 주소를 직접 선택해 복사해주세요.' })
    }
  }
  return (
    <span className="addr-text">
      <span title={address} className={full ? 'mono' : ''}>{full ? address : short(address)}</span>
      <button className="icon-btn sm" onClick={copy} aria-label={`주소 ${short(address)} 복사`}>⧉</button>
    </span>
  )
}
