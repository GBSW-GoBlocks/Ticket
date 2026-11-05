import { isListed } from '../lib/stage'
import { ticketPriceText } from '../lib/priceText'

// 목록(listbox) 안의 한 줄. 내 티켓은 TicketStub 을 쓴다.
export default function TicketRow({ ticket, event, children }) {
  const listed = event ? isListed(ticket, event) : ticket.onSale
  return (
    <li>
      <div>
        <span className="item-title">#{ticket.id.toString()}</span>
        {event && <span className="muted"> · {event.title}</span>}
        <div className="muted">{ticketPriceText(ticket, event)}{listed ? ' · 판매중' : ''}{ticket.used ? ' · 입장 완료' : ''}</div>
      </div>
      <div className="actions">{children}</div>
    </li>
  )
}
