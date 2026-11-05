import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEvents, useTickets, useTx, useWalletContext } from '../lib/hooks'
import { StatusBadge, Empty, Skeleton, Hint } from '../components/ui'
import AddressText from '../components/AddressText'
import TicketActions from '../components/TicketActions'
import GuardedButton from '../components/GuardedButton'
import { same, formatEth, parseId } from '../lib/format'
import { ownedIn } from '../lib/stats'
import { reserveBlock, resaleBlock } from '../lib/reasons'
import { usePageTitle } from '../lib/title'
import { isListed, stageOf } from '../lib/stage'
import { useConfirm } from '../lib/confirm'
import { confirmReserve, confirmResale } from '../lib/confirmCopy'
import { ticketPriceText } from '../lib/priceText'
import { TICKET_ADDRESS } from '../lib/wagmi'

const GUIDE = {
  draft: '공연 준비 중입니다.',
  reserving: '예매 기간에는 환불할 수 있습니다. 공연이 시작되면 "입장하기"로 입장 처리합니다.',
  closed: '예매가 마감되었습니다. 공연 시작 전까지 티켓 2차 거래에서 양도할 수 있습니다.',
  started: '공연 중입니다. 입장할 때 "입장하기"를 눌러 입장 처리하세요. 입장 후에는 양도·환불할 수 없습니다.',
  finished: '종료된 공연입니다.',
  cancled: '취소된 공연입니다.',
}

// 소유 상황 한 줄
function ownerLine(ticket, event, mine, primary, listed) {
  if (ticket.used) return mine ? '입장이 완료된 티켓입니다.' : '입장이 완료되어 사용된 티켓입니다.'
  if (mine) return '내가 보유한 티켓입니다.'
  if (primary) return listed ? '주최자가 판매 중인 티켓입니다.' : '주최자가 보유한 티켓입니다. 지금은 판매 중이 아닙니다.'
  return '다른 사용자가 보유한 티켓입니다.'
}

export default function TicketDetail() {
  const id = parseId(useParams().id)
  const ctx = useWalletContext()
  const ask = useConfirm()
  const navigate = useNavigate()
  const { data: events = [] } = useEvents()
  const { data: tickets = [], isLoading } = useTickets()
  const { send, busy } = useTx()

  const ticket = id ? tickets.find((t) => t.id === BigInt(id)) : null
  const event = ticket ? events.find((e) => e.id === ticket.eventId) : null
  usePageTitle(id ? `티켓 #${id}` : '티켓')
  if (!ticket) return isLoading ? <Skeleton rows={2} /> : <Empty to="/my" label="내 티켓으로">존재하지 않거나 소각된 티켓입니다.</Empty>

  const mine = same(ticket.owner, ctx.address)
  const listed = isListed(ticket, event)
  const primary = !!event && same(ticket.owner, event.registrant)
  const owned = event ? ownedIn(tickets, event.id, ctx.address) : 0
  const block = event ? (primary ? reserveBlock(ctx, event, { owned }) : resaleBlock(ctx, event, ticket, owned)) : ''
  const stage = event ? stageOf(event) : null

  const buy = async () => {
    const ok = await (primary ? confirmReserve : confirmResale)(ask, ticket, event)
    if (!ok) return
    send(primary ? 'reserveTicket' : 'buyTicket', [ticket.id], ticket.price,
      `티켓 #${id} ${primary ? '예매' : '양도 구매'} (${formatEth(ticket.price)} ETH)`, { action: { to: '/my', label: '내 티켓 보기' } })
  }

  const status = ticket.used ? '입장 완료' : listed ? (primary ? '예매 가능' : '양도 중') : mine ? (ticket.traded ? '보유 중 (양도받음)' : '보유 중') : primary ? '주최자 보유 (판매 중 아님)' : '보유 중'

  return (
    <>
      <p className="crumb"><Link to="/my">내 티켓</Link> › 티켓 #{id}</p>
      <div className="split-2">
        <div className="ticket-hero on-ink">
          <span>{event?.title ?? `행사 #${ticket.eventId}`}</span>
          <strong className="no">티켓 #{id}</strong>
          <p>{ownerLine(ticket, event, mine, primary, listed)}</p>
          {stage && !ticket.used && <p>{GUIDE[stage]}</p>}
        </div>
        <div className="detail-info">
          {event && <StatusBadge event={event} />}
          <h1>{event?.title ?? `티켓 #${id}`}</h1>
          <dl className="kv">
            <dt>티켓 번호</dt><dd>#{id}</dd>
            <dt>가격</dt><dd>{ticketPriceText(ticket, event)}</dd>
            <dt>상태</dt><dd>{status}</dd>
            <dt>소유자</dt><dd><AddressText address={ticket.owner} />{mine && ' (나)'}</dd>
            <dt>주최</dt><dd><AddressText address={event?.registrant} /></dd>
            <dt>발행 주소</dt><dd><AddressText address={TICKET_ADDRESS} /></dd>
          </dl>
          <div className="actions">
            {mine && <TicketActions ticket={ticket} event={event} send={send} busy={busy} onDone={() => navigate('/my')} />}
            {!mine && listed && event && (
              <GuardedButton reason={block} busy={busy} describedBy="td-hint" onClick={buy}>
                {formatEth(ticket.price)} ETH {primary ? '예매' : '구매'}
              </GuardedButton>
            )}
            {event && <Link className="btn ghost" to={`/events/${event.id}`}>공연 보기</Link>}
          </div>
          {!mine && listed && <Hint id="td-hint">{block}</Hint>}
        </div>
      </div>
    </>
  )
}
