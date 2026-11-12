import { Link } from 'react-router-dom'
import { StatusBadge, SoldOutBadge } from './ui'
import Poster from './Poster'
import { formatEth } from '../lib/format'
import { stageOf } from '../lib/stage'

// 단계마다 카드에서 알아야 할 한 줄. 가격이 있으면 가격을, 없으면 지금 할 수 있는 일을 보여 준다.
// 가격은 최저가이며, 네트워크 수수료(가스비)는 별도다.
function Summary({ stage, stats }) {
  if (!stats) return <p className="meta">&nbsp;</p>
  if (stage === 'reserving') {
    if (stats.minPrice === null) return <p className="meta">예매 가능한 티켓이 없습니다</p>
    return <p className="price">{formatEth(stats.minPrice)} <small>ETH~</small><span className="seats">잔여 {stats.open}석</span></p>
  }
  if (stage === 'closed') {
    if (!stats.resale) return <p className="meta">양도 중인 티켓이 없습니다</p>
    return <p className="price">{formatEth(stats.resaleMin)} <small>ETH~</small><span className="seats">양도 {stats.resale}장</span></p>
  }
  const text = { draft: '예매 시작 전', started: '입장은 내 티켓에서', finished: '종료된 공연', cancled: '예매자는 내 티켓에서 환불' }[stage]
  return <p className="meta">{text}</p>
}

// 포스터 위에 상태 배지, 아래에 제목과 단계별 요약 한 줄. 데스크톱은 세로 카드, 모바일 목록은 가로 행(CSS).
export default function EventCard({ event, stats }) {
  const stage = stageOf(event)
  const soldOut = stage === 'reserving' && stats && stats.open === 0
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      <div className="poster-box">
        <Poster src={event.image} />
        <span className="poster-badge">{soldOut ? <SoldOutBadge /> : <StatusBadge event={event} />}</span>
      </div>
      <div className="meta-box">
        <h3>{event.title}</h3>
        <Summary stage={stage} stats={stats} />
      </div>
    </Link>
  )
}
