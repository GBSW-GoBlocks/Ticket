// 이미지는 IPFS에 올려 두고 컨트랙트(eventInfo)에는 CID만 저장한다.
// ipfs:// 접두사는 컨트랙트 tokenURI가, 게이트웨이 URL은 이 파일이 읽을 때 붙인다.
// 공개 게이트웨이는 요청이 몰리면 429로 거절하므로 하나만 쓰면 이미지가 대부분 깨진다.
// 순서대로 시도한다. VITE_IPFS_GATEWAY(쉼표로 여러 개 가능, 끝은 /ipfs/)를 두면 그것을 가장 먼저 쓴다.
// 전용 게이트웨이(예: https://<이름>.mypinata.cloud/ipfs/)를 두는 것이 가장 안정적이다.
const DEFAULT_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
  'https://nftstorage.link/ipfs/',
]
const custom = (import.meta.env.VITE_IPFS_GATEWAY || '').split(',').map((s) => s.trim()).filter(Boolean)
const GATEWAYS = [...new Set([...custom, ...DEFAULT_GATEWAYS])]

// CIDv0(Qm…) 또는 CIDv1(base32, b…). 컨트랙트는 영문·숫자 100자 이하만 받으므로 경로(/)는 허용하지 않는다.
const CID_PATH = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/

// ipfs:// 를 붙여 넣어도 CID만 남긴다.
export const toCid = (raw) => (raw ?? '').trim().replace(/^ipfs:\/\//, '')

// 비워 두면 기본 이미지를 쓰므로 빈 값은 통과시킨다.
export const checkImageCid = (raw) => {
  const v = toCid(raw)
  if (!v) return ''
  return CID_PATH.test(v) ? '' : '올바른 IPFS CID를 입력하세요. (예: bafkrei…, Qm…)'
}

// 저장된 CID를 화면에 보여 줄 게이트웨이 URL로 바꾼다. 비어 있으면 빈 문자열.
export const ipfsUrl = (cid) => (cid ? `${GATEWAYS[0]}${cid}` : '')

// 시도할 게이트웨이 URL 목록. 앞의 것이 실패하면 Poster가 다음 것으로 넘어간다.
export const ipfsUrls = (cid) => (cid ? GATEWAYS.map((g) => `${g}${cid}`) : [])
