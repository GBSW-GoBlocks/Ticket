import { Link } from 'react-router-dom'
import { StatusBadge, SoldOutBadge } from './ui'
import { formatEth, short } from '../lib/format'

// K3: 데스크톱은 세로 카드, 모바일은 가로 행(CSS). 링크 안에는 상호작용 요소를 넣지 않는다.
export default function EventCard({ event, stats }) {
  const soldOut = event.progress === 0 && stats && stats.open === 0
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="poster" aria-hidden="true" />
      <div className="meta-box">
        {/* 매진이면 "예매중"과 겹쳐 보이지 않게 매진 칩 하나만 보여 준다. */}
        <div className="chip-row">{soldOut ? <SoldOutBadge /> : <StatusBadge event={event} />}</div>
        <h3>{event.title}</h3>
        <p className="meta">주최 {short(event.registrant)}</p>
        {stats && event.progress === 0 && (
          <p className="price">
            {stats.minPrice !== null ? `${formatEth(stats.minPrice)} ETH~` : <span className="muted">예매 가능한 티켓 없음</span>}
            {stats.open > 0 && <span className="muted"> · 잔여 {stats.open}석</span>}
          </p>
        )}
      </div>
    </Link>
  )
}
