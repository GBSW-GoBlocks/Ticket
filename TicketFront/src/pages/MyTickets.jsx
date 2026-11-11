import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useEvents, useTickets, useTx } from '../lib/hooks'
import { Empty, Skeleton, PageHead, ConnectPrompt } from '../components/ui'
import { splitMine } from '../lib/stats'
import { usePageTitle } from '../lib/title'
import TicketStub from '../components/TicketStub'
import TicketActions from '../components/TicketActions'

export default function MyTickets() {
  usePageTitle('내 티켓')
  const { address } = useAccount()
  const { data: events = [] } = useEvents()
  const { data: tickets = [], isLoading } = useTickets()
  const { send, busy } = useTx()

  if (!address) return <ConnectPrompt title="내 티켓">지갑을 연결하면 보유한 티켓을 볼 수 있습니다.</ConnectPrompt>
  const { held, stock } = splitMine(tickets, events, address)

  return (
    <div className="narrow">
      <PageHead title="내 티켓">{held.length}장을 보유하고 있습니다.</PageHead>
      {isLoading && <Skeleton rows={2} />}
      <ul className="stubs">
        {held.map((t) => {
          const event = events.find((e) => e.id === t.eventId)
          return (
            <TicketStub key={t.id} ticket={t} event={event}>
              <TicketActions ticket={t} event={event} send={send} busy={busy} />
              <Link className="btn ghost" to={`/tickets/${t.id}`} aria-label={`티켓 #${t.id} 상세`}>상세</Link>
            </TicketStub>
          )
        })}
      </ul>
      {!isLoading && held.length === 0 && <Empty to="/events" label="공연 둘러보기">보유한 티켓이 없습니다.</Empty>}
      {stock.length > 0 && <p className="muted" style={{ marginTop: 'var(--s4)' }}>내가 주최한 공연의 미판매 재고 {stock.length}장은 주최자 콘솔에서 관리합니다.</p>}
    </div>
  )
}
