import { useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STAGE_LABEL, STAGE_ORDER, stageOf } from '../lib/stage'
import { eventStats } from '../lib/stats'
import EventCard from './EventCard'
import { Empty } from './ui'

const SORTS = { new: '최신순', price: '낮은 가격순', seats: '잔여 많은순' }
const FILTER_MIN = 4 // 공연이 이보다 적으면 검색·필터·정렬은 숨긴다.

// 목록 도구줄(검색 · 상태 · 정렬) + 포스터 그리드. 선택값은 주소(?q= &status= &sort=)에 저장해 새로고침·공유해도 유지된다.
// autoOpen 이면 예매중이 있을 때 그것부터 보여준다.
export default function EventFeed({ events, tickets, autoOpen = false }) {
  const [params, setParams] = useSearchParams()
  const qId = useId()
  const sortId = useId()
  const present = STAGE_ORDER.filter((s) => events.some((e) => stageOf(e) === s))
  const auto = autoOpen && present.includes('reserving') ? 'reserving' : 'all'
  const picked = params.get('status')
  const filter = picked && (picked === 'all' || present.includes(picked)) ? picked : auto
  const q = params.get('q') ?? ''
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'new'
  const showTools = events.length >= FILTER_MIN

  const rows = events
    .filter((e) => filter === 'all' || stageOf(e) === filter)
    .filter((e) => !q.trim() || e.title.toLowerCase().includes(q.trim().toLowerCase()))
    .map((e) => ({ e, s: eventStats(e, tickets) }))
    .sort((a, b) => {
      if (sort === 'price') return (a.s.minPrice ?? Infinity) < (b.s.minPrice ?? Infinity) ? -1 : 1
      if (sort === 'seats') return b.s.open - a.s.open || b.e.id - a.e.id
      return b.e.id - a.e.id
    })

  const set = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (!value || value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }
  const options = [['all', '전체'], ...present.map((s) => [s, STAGE_LABEL[s]])]

  return (
    <div className="stack">
      {showTools && (
        <div className="feed-tools">
          <div className="chips" role="group" aria-label="상태 필터">
            {options.map(([k, l]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => set('status', k, auto)}>{l}</button>
            ))}
          </div>
          <div className="feed-find">
            <div className="field">
              <label htmlFor={qId} className="sr-only">공연 검색</label>
              <input id={qId} type="search" value={q} placeholder="공연 제목 검색" onChange={(e) => set('q', e.target.value, '')} />
            </div>
            <div className="field">
              <label htmlFor={sortId} className="sr-only">정렬</label>
              <select id={sortId} value={sort} onChange={(e) => set('sort', e.target.value, 'new')}>
                {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      {showTools && <p className="muted" role="status">{rows.length}개의 공연</p>}
      <div className="event-grid">{rows.map(({ e, s }) => <EventCard key={e.id} event={e} stats={s} />)}</div>
      {rows.length === 0 && <Empty>조건에 맞는 공연이 없습니다. 검색어를 지우거나 상태에서 "전체"를 눌러보세요.</Empty>}
    </div>
  )
}
