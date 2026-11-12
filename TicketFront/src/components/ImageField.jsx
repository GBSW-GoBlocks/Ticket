import Field from './Field'
import Poster from './Poster'
import { checkImageCid, ipfsUrls, toCid } from '../lib/ipfs'

// 이미지 CID 입력 + 포스터 미리보기. 입력값이 올바른 CID면 그 이미지를, 아니면 fallback(현재 이미지)을 보여 준다.
// 등록 폼·공연별 이미지 변경·관리자 기본 이미지가 같은 모양과 같은 검증을 쓰게 한다.
export default function ImageField({ label, hint, value, onChange, error, required, fallback, placeholder = 'bafkrei…' }) {
  const cid = toCid(value)
  const src = cid && !checkImageCid(cid) ? ipfsUrls(cid) : fallback
  return (
    <div className="image-setting">
      <Poster src={src} />
      <Field label={label} hint={hint} error={error} value={value} onChange={onChange} required={required} placeholder={placeholder} />
    </div>
  )
}
