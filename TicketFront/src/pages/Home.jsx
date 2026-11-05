import { Link } from 'react-router-dom'
import { useEvents, useTickets } from '../lib/hooks'
import { eventStats } from '../lib/stats'
import { formatEth } from '../lib/format'
import { usePageTitle } from '../lib/title'
import EventFeed from '../components/EventFeed'
import Poster from '../components/Poster'
import { Empty, Skeleton, StatusBadge } from '../components/ui'

// 마케팅 구성: 히어로(예매중 최신 1건) + 필터 피드. 예매중 공연이 없으면 소개 문구와 공연 목록 링크.
export default function Home() {
  usePageTitle('')
  const { data: events = [], isLoading } = useEvents()
  const { data: tickets = [] } = useTickets()
  const open = events.filter((e) => e.progress === 0)
  // 잔여 티켓이 있는 예매중 공연 중 최신 1건. 모두 매진이면 예매중 최신 1건.
  const withSeats = open.filter((e) => eventStats(e, tickets).open > 0)
  const featured = withSeats[withSeats.length - 1] ?? open[open.length - 1]
  const stats = featured ? eventStats(featured, tickets) : null

  return (
    <div className="stack" style={{ gap: 'var(--s8)' }}>
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
                  <Link className="btn ghost" to="/events" style={{ background: 'transparent', color: '#fff', borderColor: '#8b88a3' }}>전체 공연 보기</Link>
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

      <section aria-labelledby="home-feed">
        <div className="row" style={{ marginBottom: 'var(--s4)' }}>
          <h2 id="home-feed">공연</h2>
          <Link className="btn ghost" to="/events">전체 보기</Link>
        </div>
        {isLoading && <Skeleton rows={3} />}
        {!isLoading && events.length === 0 && <Empty to="/events" label="공연 목록으로">등록된 공연이 없습니다.</Empty>}
        {events.length > 0 && <EventFeed events={events} tickets={tickets} autoOpen />}
      </section>
    </div>
  )
}
