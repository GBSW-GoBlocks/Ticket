import { useSearchParams } from 'react-router-dom'
import { STAGE_LABEL, STAGE_ORDER, stageOf } from '../lib/stage'
import { eventStats } from '../lib/stats'
import EventCard from './EventCard'
import { Empty } from './ui'

// H1: 필터 칩 + 카드 피드. 공연이 4건 미만이면 칩은 숨긴다. autoOpen 이면 예매중이 있을 때 그것부터 보여준다.
// 선택한 필터는 주소(?status=)에 저장해 새로고침·공유해도 유지된다.
export default function EventFeed({ events, tickets, autoOpen = false }) {
  const [params, setParams] = useSearchParams()
  const picked = params.get('status')
  const present = STAGE_ORDER.filter((s) => events.some((e) => stageOf(e) === s))
  const auto = autoOpen && present.includes('reserving') ? 'reserving' : 'all'
  const filter = picked && (picked === 'all' || present.includes(picked)) ? picked : auto
  const shown = filter === 'all' ? events : events.filter((e) => stageOf(e) === filter)
  const options = [['all', '전체'], ...present.map((s) => [s, STAGE_LABEL[s]])]

  const choose = (k) => {
    const next = new URLSearchParams(params)
    if (k === auto) next.delete('status')
    else next.set('status', k)
    setParams(next, { replace: true })
  }

  return (
    <div className="stack">
      {events.length >= 4 && (
        <div className="chips" role="group" aria-label="상태 필터">
          {options.map(([k, l]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => choose(k)}>{l}</button>
          ))}
        </div>
      )}
      <div className="event-grid">{shown.map((e) => <EventCard key={e.id} event={e} stats={eventStats(e, tickets)} />)}</div>
      {shown.length === 0 && <Empty>이 상태의 공연이 없습니다. 위에서 "전체"를 눌러 다른 공연을 확인해보세요.</Empty>}
    </div>
  )
}
