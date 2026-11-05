import { same } from './format'

// 행사별 예매 가능 티켓 수와 최저가
export function eventStats(event, tickets) {
  const open = tickets.filter((t) => t.eventId === event.id && t.onSale && same(t.owner, event.registrant))
  const minPrice = open.length ? open.map((t) => t.price).reduce((a, b) => (a < b ? a : b)) : null
  return { open: open.length, minPrice }
}

// 내 티켓 = 보유 티켓. 주최자가 자기 행사에서 들고 있는 미판매 재고는 따로 센다.
export function splitMine(tickets, events, address) {
  const mine = tickets.filter((t) => same(t.owner, address))
  const own = new Set(events.filter((e) => same(e.registrant, address)).map((e) => e.id))
  return {
    held: mine.filter((t) => !own.has(t.eventId)),
    stock: mine.filter((t) => own.has(t.eventId)),
  }
}

// 이 행사에서 내가 보유한 티켓 수 (지갑당 한도 판단용)
export const ownedIn = (tickets, eventId, address) =>
  tickets.filter((t) => t.eventId === eventId && same(t.owner, address)).length
