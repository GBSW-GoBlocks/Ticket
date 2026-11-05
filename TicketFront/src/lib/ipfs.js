// 이미지는 IPFS에 올려 두고 컨트랙트(eventInfo)에는 CID만 저장한다.
// ipfs:// 접두사는 컨트랙트 tokenURI가, 게이트웨이 URL은 이 파일이 읽을 때 붙인다.
const GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'

// CIDv0(Qm…) 또는 CIDv1(base32, b…) + 선택적 경로. JSON을 깨뜨리는 따옴표 등은 이 형식에서 걸러진다.
const CID_PATH = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})(\/[\w.\-/]*)?$/

// ipfs:// 를 붙여 넣어도 CID만 남긴다.
export const toCid = (raw) => (raw ?? '').trim().replace(/^ipfs:\/\//, '')

// 비워 두면 기본 이미지를 쓰므로 빈 값은 통과시킨다.
export const checkImageCid = (raw) => {
  const v = toCid(raw)
  if (!v) return ''
  return CID_PATH.test(v) ? '' : '올바른 IPFS CID를 입력하세요. (예: bafkrei…, Qm…)'
}

// 저장된 CID를 화면에 보여 줄 게이트웨이 URL로 바꾼다. 비어 있으면 빈 문자열.
export const ipfsUrl = (cid) => (cid ? `${GATEWAY}${cid}` : '')
