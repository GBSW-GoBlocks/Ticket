import { isListed } from '../lib/stage'
import { ticketPriceText } from '../lib/priceText'
import { StatusBadge } from './ui'
import Poster from './Poster'

// 내 티켓: 절취선이 있는 스텁. 왼쪽은 티켓 정보, 오른쪽은 지금 할 수 있는 동작.
export default function TicketStub({ ticket, event, children }) {
  const listed = event ? isListed(ticket, event) : ticket.onSale
  return (
    <li className="stub">
      <div className="stub-thumb"><Poster src={event?.image} /></div>
      <div className="stub-main">
        <span className="stub-no">티켓 #{ticket.id.toString()}</span>
        <span>{event?.title ?? `행사 #${ticket.eventId}`}</span>
        <span className="muted">
          {ticketPriceText(ticket, event)}{listed ? ' · 판매중' : ''}{ticket.used ? ' · 입장 완료' : ''}
        </span>
        {event && <span className="chip-row"><StatusBadge event={event} /></span>}
      </div>
      <div className="stub-side">{children}</div>
    </li>
  )
}
