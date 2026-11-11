import { Link } from 'react-router-dom'
import { StatusBadge, SoldOutBadge } from './ui'
import Poster from './Poster'
import { formatEth, short } from '../lib/format'

// 포스터 위에 상태 배지, 아래에 제목·가격·잔여석. 데스크톱은 세로 카드, 모바일은 가로 행(CSS).
// 가격은 계약의 최저 예매가이며, 네트워크 수수료(가스비)는 별도다.
export default function EventCard({ event, stats }) {
  const reserving = event.progress === 0
  const soldOut = reserving && stats && stats.open === 0
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="poster-box">
        <Poster src={event.image} />
        <span className="poster-badge">{soldOut ? <SoldOutBadge /> : <StatusBadge event={event} />}</span>
      </div>
      <div className="meta-box">
        <h3>{event.title}</h3>
        <p className="meta">주최 {short(event.registrant)}</p>
        {stats && reserving && (
          <p className="price">
            {stats.minPrice !== null ? <>{formatEth(stats.minPrice)} <small>ETH~</small></> : <span className="muted">예매 가능한 티켓 없음</span>}
            {stats.open > 0 && <span className="seats">잔여 {stats.open}석</span>}
          </p>
        )}
      </div>
    </Link>
  )
}
