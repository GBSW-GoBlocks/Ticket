import { isListed, stageOf } from '../lib/stage'
import { ticketPriceText } from '../lib/priceText'
import { StatusBadge } from './ui'
import Poster from './Poster'

// 이 티켓으로 지금 할 수 있는 일(또는 끝난 일). 공연 단계 칩 옆에 함께 보여 준다.
function ticketState(ticket, event, listed) {
  if (ticket.used) return '입장 완료'
  if (listed) return '양도 중'
  const stage = event ? stageOf(event) : null
  if (stage === 'started') return '입장 가능'
  if (stage === 'cancled' && !ticket.traded) return '환불 가능'
  if (stage === 'reserving' && !ticket.traded) return '환불 가능'
  if (stage === 'closed') return '양도 가능'
  return null
}

// 내 티켓: 절취선이 있는 스텁. 왼쪽은 공연(제목이 주 제목)과 티켓 정보, 오른쪽은 지금 할 수 있는 동작.
export default function TicketStub({ ticket, event, children }) {
  const listed = event ? isListed(ticket, event) : ticket.onSale
  const state = ticketState(ticket, event, listed)
  return (
    <li className="stub">
      <div className="stub-thumb"><Poster src={event?.image} /></div>
      <div className="stub-main">
        <span className="chip-row">
          {event && <StatusBadge event={event} />}
          {state && <span className="chip chip-state">{state}</span>}
        </span>
        <span className="stub-title">{event?.title ?? `행사 #${ticket.eventId}`}</span>
        <span className="muted">티켓 #{ticket.id.toString()} · {ticketPriceText(ticket, event)}</span>
      </div>
      <div className="stub-side">{children}</div>
    </li>
  )
}
