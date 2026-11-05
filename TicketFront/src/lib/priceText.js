import { formatEth, same } from './format'
import { isListed } from './stage'

// 티켓 가격 표기: 판매 중이면 판매가(양도면 원가 병기), 아니면 최초 예매가.
// 양도 등록을 중단해도 컨트랙트에는 이전 판매가가 남으므로 판매 중이 아닐 때는 원가를 보여 준다.
export function ticketPriceText(ticket, event) {
  const listed = event ? isListed(ticket, event) : ticket.onSale
  const primary = event && same(ticket.owner, event.registrant)
  if (listed && primary) return `${formatEth(ticket.price)} ETH`
  if (listed) {
    const same_ = ticket.price === ticket.reservationPrice
    return `양도가 ${formatEth(ticket.price)} ETH${same_ ? '' : ` (최초 예매가 ${formatEth(ticket.reservationPrice)} ETH)`}`
  }
  return `최초 예매가 ${formatEth(ticket.reservationPrice)} ETH`
}
