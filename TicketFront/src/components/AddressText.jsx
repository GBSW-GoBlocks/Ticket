import { short } from '../lib/format'
import { addressUrl } from '../lib/explorer'
import { useToast } from '../lib/toast'
import Icon from './Icon'

// 주소 표기: 앞뒤만 보이게 줄이고, 전체 복사와(link 이면) 블록 탐색기 링크를 붙인다.
export default function AddressText({ address, full = false, link = false }) {
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
  const url = link ? addressUrl(address) : null
  return (
    <span className="addr-text">
      <span title={address} className={full ? 'mono' : ''}>{full ? address : short(address)}</span>
      <button className="icon-btn sm" onClick={copy} aria-label={`주소 ${short(address)} 복사`}><Icon name="copy" /></button>
      {url && <a className="icon-btn sm" href={url} target="_blank" rel="noreferrer" aria-label={`주소 ${short(address)} 탐색기에서 보기 (새 창)`}><Icon name="external" /></a>}
    </span>
  )
}
