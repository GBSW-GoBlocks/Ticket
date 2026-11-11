import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useEvents, useTickets, useTx } from '../lib/hooks'
import { Empty, Skeleton, PageHead, ConnectPrompt } from '../components/ui'
import { splitMine } from '../lib/stats'
import { isListed, stageOf } from '../lib/stage'
import { usePageTitle } from '../lib/title'
import Tabs from '../components/Tabs'
import TicketStub from '../components/TicketStub'
import TicketActions from '../components/TicketActions'

// 보유 티켓을 지금 할 일 기준으로 나눈다. 취소된 공연은 환불해야 하므로 "보유 중"에 둔다.
const EMPTY = {
  held: '지금 보유 중인 티켓이 없습니다.',
  selling: '양도 중인 티켓이 없습니다. 보유 중인 티켓에서 양도 등록할 수 있습니다.',
  past: '종료되었거나 입장 완료한 티켓이 없습니다.',
}

export default function MyTickets() {
  usePageTitle('내 티켓')
  const { address } = useAccount()
  const { data: events = [] } = useEvents()
  const { data: tickets = [], isLoading } = useTickets()
  const { send, busy } = useTx()
  const [tab, setTab] = useState('held')

  if (!address) return <ConnectPrompt title="내 티켓">지갑을 연결하면 보유한 티켓을 볼 수 있습니다.</ConnectPrompt>
  const { held, stock } = splitMine(tickets, events, address)
  const eventOf = (t) => events.find((e) => e.id === t.eventId)
  const isPast = (t) => t.used || ['finished'].includes(stageOf(eventOf(t) ?? { progress: 0 }))
  const groups = {
    held: held.filter((t) => !isPast(t) && !isListed(t, eventOf(t))),
    selling: held.filter((t) => !isPast(t) && isListed(t, eventOf(t))),
    past: held.filter(isPast),
  }
  const shown = groups[tab]

  return (
    <div className="narrow">
      <PageHead title="내 티켓">{held.length}장을 보유하고 있습니다.</PageHead>
      <Tabs idPrefix="my" value={tab} onChange={setTab}
        tabs={[{ key: 'held', label: `보유 중 ${groups.held.length}` }, { key: 'selling', label: `양도 중 ${groups.selling.length}` }, { key: 'past', label: `지난 티켓 ${groups.past.length}` }]} />
      <div role="tabpanel" id="my-panel" aria-labelledby={`my-${tab}`} className="tab-body">
        {isLoading && <Skeleton rows={2} />}
        <ul className="stubs">
          {shown.map((t) => {
            const event = eventOf(t)
            return (
              <TicketStub key={t.id} ticket={t} event={event}>
                <TicketActions ticket={t} event={event} send={send} busy={busy} />
                <Link className="btn ghost" to={`/tickets/${t.id}`} aria-label={`티켓 #${t.id} 상세`}>상세</Link>
              </TicketStub>
            )
          })}
        </ul>
        {!isLoading && shown.length === 0 && (
          <Empty to={tab === 'held' && held.length === 0 ? '/events' : undefined} label="공연 둘러보기">{EMPTY[tab]}</Empty>
        )}
      </div>
      {stock.length > 0 && <p className="muted" style={{ marginTop: 'var(--s4)' }}>내가 주최한 공연의 미판매 재고 {stock.length}장은 주최자 콘솔에서 관리합니다.</p>}
    </div>
  )
}
