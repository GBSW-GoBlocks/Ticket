import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useEvents, useTickets } from '../lib/hooks'
import { eventStats, splitMine } from '../lib/stats'
import { formatEth } from '../lib/format'
import { stageOf } from '../lib/stage'
import { usePageTitle } from '../lib/title'
import EventCard from '../components/EventCard'
import Poster from '../components/Poster'
import { Empty, Skeleton, StatusBadge } from '../components/ui'

// 홈 구성: 추천 1건(히어로) + 내 티켓 요약(연결 시) + 단계별 섹션 + 이용 방법.
// 비어 있는 섹션은 보여주지 않는다.
const RAILS = [
  { key: 'reserving', title: '지금 예매할 수 있는 공연', stages: ['reserving'], link: '/events?status=reserving' },
  { key: 'closed', title: '양도 티켓을 찾아보세요', stages: ['closed', 'started'], link: '/market' },
  { key: 'draft', title: '오픈 예정', stages: ['draft'], link: '/events?status=draft' },
  { key: 'finished', title: '지난 공연', stages: ['finished', 'cancled'], link: '/events?status=finished' },
]

const STEPS = [
  ['지갑 연결', '회원가입 없이 지갑만 연결하면 됩니다.'],
  ['예매', '표시된 가격 그대로 결제합니다. 네트워크 수수료(가스비)만 별도입니다.'],
  ['입장 또는 양도', '공연 당일 내 티켓에서 입장하고, 못 가게 되면 예매가 이하로 양도합니다.'],
]

// 데스크톱은 한 줄 격자(넘치는 카드는 "전체 보기"로), 모바일은 옆으로 넘기는 레일이다. (CSS)
function Rail({ title, link, items, tickets }) {
  return (
    <section aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        <Link className="more" to={link}>전체 보기<span className="sr-only"> ({title})</span></Link>
      </div>
      <ul className="rail">
        {items.map((e) => <li key={e.id}><EventCard event={e} stats={eventStats(e, tickets)} /></li>)}
      </ul>
    </section>
  )
}

// 지갑을 연결한 사용자에게: 지금 처리할 티켓이 있으면 그것부터 알려 준다.
function MyStrip({ tickets, events, address }) {
  const { held } = splitMine(tickets, events, address)
  if (held.length === 0) return null
  const stage = (t) => {
    const e = events.find((x) => x.id === t.eventId)
    return e ? stageOf(e) : null
  }
  const enter = held.filter((t) => !t.used && stage(t) === 'started').length
  const refund = held.filter((t) => !t.traded && stage(t) === 'cancled').length
  const todo = [enter && `지금 입장할 수 있는 티켓 ${enter}장`, refund && `환불 받을 티켓 ${refund}장`].filter(Boolean)
  return (
    <section className="my-strip" aria-label="내 티켓 요약">
      <p>
        <strong>내 티켓 {held.length}장</strong>
        {todo.length > 0 && <span className="todo"> · {todo.join(' · ')}</span>}
      </p>
      <Link className={`btn${todo.length ? '' : ' ghost'}`} to="/my">내 티켓 보기</Link>
    </section>
  )
}

export default function Home() {
  usePageTitle('')
  const { address } = useAccount()
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
        {featured ? (
          <div className="hero">
            <div className="hero-text">
              <div className="chip-row"><StatusBadge event={featured} /></div>
              <h1>{featured.title}</h1>
              <p>
                {stats?.minPrice != null ? `${formatEth(stats.minPrice)} ETH부터 · ` : ''}
                {stats?.open ? `잔여 ${stats.open}석` : '모든 티켓이 예매되었습니다. 티켓 2차 거래를 확인해보세요'}
              </p>
            </div>
            <Link to={`/events/${featured.id}`} className="hero-poster" tabIndex={-1} aria-hidden="true"><Poster src={featured.image} /></Link>
            <div className="hero-meta">
              <Link className="btn light" to={`/events/${featured.id}`}>{stats?.open ? '예매하기' : '공연 보기'}</Link>
              <Link className="btn on-ink" to="/events">전체 공연 보기</Link>
            </div>
          </div>
        ) : (
          <div className="hero no-poster">
            <div className="hero-text">
              <h1>블록체인으로 예매하고, 안전하게 양도하세요</h1>
              <p>지금은 예매 중인 공연이 없습니다. 공연 목록에서 진행 중인 공연과 양도 티켓을 확인할 수 있습니다.</p>
            </div>
            <div className="hero-meta"><Link className="btn light" to="/events">공연 둘러보기</Link></div>
          </div>
        )}
      </section>

      {address && <MyStrip tickets={tickets} events={events} address={address} />}

      {isLoading && <Skeleton kind="cards" rows={4} />}
      {!isLoading && events.length === 0 && <Empty>아직 등록된 공연이 없습니다.</Empty>}
      {rails.map((r) => <Rail key={r.key} title={r.title} link={r.link} items={r.items} tickets={tickets} />)}

      <section className="howto" aria-labelledby="howto-h">
        <h2 id="howto-h">이용 방법</h2>
        <ol>
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="howto-no" aria-hidden="true">{i + 1}</span>
              <div><strong>{t}</strong><p className="muted">{d}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
