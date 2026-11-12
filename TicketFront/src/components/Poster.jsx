import { useState } from 'react'

// 행사 이미지. src는 URL 하나 또는 URL 목록이다. 목록이면 앞에서부터 시도하고, 모두 실패하면 기본 그라데이션 포스터를 보여 준다.
// IPFS 공개 게이트웨이는 요청 제한(429)으로 자주 실패하므로 다음 게이트웨이로 넘어가야 한다.
function Image({ urls }) {
  const [tried, setTried] = useState(0)
  const url = urls[tried]
  if (!url) return null
  return <img key={url} src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setTried((n) => n + 1)} />
}

export default function Poster({ src }) {
  const urls = [].concat(src || []).filter(Boolean)
  // 대상이 바뀌면(예: 주소 갱신) 시도 상태를 처음부터 다시 시작한다.
  return (
    <div className="poster" aria-hidden="true">
      <Image key={urls.join('|')} urls={urls} />
    </div>
  )
}
