import { Link } from 'react-router-dom'
import { useEvents, useTickets } from '../lib/hooks'
import { eventStats } from '../lib/stats'
import { formatEth } from '../lib/format'
import { stageOf } from '../lib/stage'
import { usePageTitle } from '../lib/title'
import EventCard from '../components/EventCard'
import Poster from '../components/Poster'
import { Empty, Skeleton, StatusBadge } from '../components/ui'

// 홈 구성: 추천 1건(히어로) + 단계별 가로 레일. 비어 있는 레일은 보여주지 않는다.
const RAILS = [
  { key: 'reserving', title: '지금 예매할 수 있는 공연', stages: ['reserving'], link: '/events?status=reserving' },
  { key: 'closed', title: '양도 티켓을 찾아보세요', stages: ['closed', 'started'], link: '/market' },
  { key: 'draft', title: '오픈 예정', stages: ['draft'], link: '/events?status=draft' },
  { key: 'finished', title: '지난 공연', stages: ['finished', 'cancled'], link: '/events?status=finished' },
]

function Rail({ title, link, items, tickets }) {
  return (
    <section aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        <Link className="more" to={link}>전체 보기</Link>
      </div>
      <ul className="rail">
        {items.map((e) => <li key={e.id}><EventCard event={e} stats={eventStats(e, tickets)} /></li>)}
      </ul>
    </section>
  )
}

export default function Home() {
  usePageTitle('')
  const { data: events = [], isLoading } = useEvents()
  const { data: tickets = [] } = useTickets()
  const open = events.filter((e) => e.progress === 0)
  // 잔여 티켓이 있는 예매중 공연 중 최신 1건. 모두 매진이면 예매중 최신 1건.
  const withSeats = open.filter((e) => eventStats(e, tickets).open > 0)
  const featured = withSeats[withSeats.length - 1] ?? open[open.length - 1]
  const stats = featured ? eventStats(featured, tickets) : null
  const latest = [...events].sort((a, b) => b.id - a.id)
  const rails = RAILS.map((r) => ({ ...r, items: latest.filter((e) => r.stages.includes(stageOf(e))).slice(0, 8) })).filter((r) => r.items.length)

  return (
    <div className="home">
      <section className="band on-ink" aria-label="추천 공연">
        <div className="hero">
          <div>
            {featured ? (
              <>
                <div className="chip-row"><StatusBadge event={featured} /></div>
                <h1>{featured.title}</h1>
                <p>
                  {stats?.minPrice != null ? `${formatEth(stats.minPrice)} ETH부터 · ` : ''}
                  {stats?.open ? `잔여 ${stats.open}석` : '모든 티켓이 예매되었습니다. 티켓 2차 거래를 확인해보세요'}
                </p>
                <div className="hero-meta">
                  <Link className="btn light" to={`/events/${featured.id}`}>예매하기</Link>
                  <Link className="btn on-ink" to="/events">전체 공연 보기</Link>
                </div>
              </>
            ) : (
              <>
                <h1>블록체인으로 예매하고, 안전하게 양도하세요</h1>
                <p>지금은 예매 중인 공연이 없습니다. 공연 목록에서 진행 중인 공연과 양도 티켓을 확인할 수 있습니다.</p>
                <Link className="btn light" to="/events">공연 둘러보기</Link>
              </>
            )}
          </div>
          {featured && <Poster src={featured.image} />}
        </div>
      </section>

      {isLoading && <Skeleton rows={3} />}
      {!isLoading && events.length === 0 && <Empty to="/events" label="공연 목록으로">등록된 공연이 없습니다.</Empty>}
      {rails.map((r) => <Rail key={r.key} {...r} tickets={tickets} />)}
    </div>
  )
}
