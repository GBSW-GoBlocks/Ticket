import { same } from './format'

// 버튼이 비활성일 때 사용자에게 보여줄 이유 (빈 문자열이면 가능)
export function baseBlock({ address, role, wrongChain }) {
  if (!address) return '지갑을 연결해주세요.'
  if (wrongChain) return '지갑 네트워크를 전환해주세요.'
  if (!role) return '계정 권한을 확인하는 중입니다.'
  if (role === 'seller') return '주최자 계정으로는 티켓을 구매할 수 없습니다.'
  return ''
}

const limitMsg = (event) => `이 공연은 지갑당 최대 ${event.maxOwnable}장까지 보유할 수 있습니다.`

export function reserveBlock(ctx, event, { hasTicket = true, owned = 0 } = {}) {
  return (
    baseBlock(ctx) ||
    (event.progress !== 0 ? '지금은 예매 기간이 아닙니다.' : '') ||
    (hasTicket ? '' : '예매 가능한 티켓이 없습니다. (매진)') ||
    (owned >= event.maxOwnable ? limitMsg(event) : '')
  )
}

export function resaleBlock(ctx, event, ticket, owned = 0) {
  return (
    baseBlock(ctx) ||
    (event.progress !== 1 || !event.reserved ? '양도 티켓은 예매 마감 후 공연 시작 전에만 구매할 수 있습니다.' : '') ||
    (same(ticket.owner, ctx.address) ? '내가 등록한 티켓입니다.' : '') ||
    (owned >= event.maxOwnable ? limitMsg(event) : '')
  )
}
