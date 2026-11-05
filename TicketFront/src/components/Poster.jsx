import { useState } from 'react'

// 행사 이미지(IPFS 게이트웨이 주소). 없거나 불러오지 못하면 기본 그라데이션 포스터를 보여 준다.
export default function Poster({ src }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="poster" aria-hidden="true">
      {src && !failed && <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />}
    </div>
  )
}
