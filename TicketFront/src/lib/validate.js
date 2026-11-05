import { isAddress, parseEther } from 'viem'

// 받침 유무에 따라 조사를 고른다. (한글이 아니면 받침 없음으로 본다)
export function josa(word, withFinal, withoutFinal) {
  const code = (word ?? '').trim().charCodeAt((word ?? '').trim().length - 1)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  return isHangul && (code - 0xac00) % 28 !== 0 ? withFinal : withoutFinal
}

// 앞뒤 공백은 지우고 검사한다.
export const checkEth = (raw) => {
  const v = (raw ?? '').trim()
  if (!v) return '금액을 입력하세요.'
  if ((v.split('.')[1] ?? '').length > 18) return '소수점 아래 18자리까지만 입력할 수 있습니다.'
  try {
    return parseEther(v) > 0n ? '' : '0보다 커야 합니다.'
  } catch {
    return '숫자만 입력하세요. (예: 0.05)'
  }
}
export const checkInt = (raw, label) => {
  const v = (raw ?? '').trim()
  return /^[1-9]\d*$/.test(v) ? '' : `${label}${josa(label, '은', '는')} 1 이상의 정수여야 합니다.`
}
export const checkText = (v, label) => ((v ?? '').trim() ? '' : `${label}${josa(label, '을', '를')} 입력하세요.`)
export const checkAddress = (raw) => (isAddress((raw ?? '').trim()) ? '' : '올바른 주소(0x…)를 입력하세요.')
