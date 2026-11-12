import { useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STAGE_LABEL, STAGE_ORDER, stageOf } from '../lib/stage'
import { eventStats } from '../lib/stats'
import EventCard from './EventCard'
import { Empty } from './ui'

const SORTS = { new: '최신순', price: '낮은 가격순', seats: '잔여 많은순' }
const FILTER_MIN = 4 // 공연이 이보다 적고 걸린 조건도 없으면 검색·필터·정렬은 숨긴다.

// 목록 도구줄(상태 칩 · 결과 수 · 검색 · 정렬) + 포스터 그리드.
// 선택값은 주소(?q= &status= &sort=)에 저장해 새로고침·공유해도 유지된다.
// 조건이 하나라도 걸려 있으면(헤더 검색으로 들어온 경우 포함) 도구줄을 항상 보여 주어 지울 수 있게 한다.
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
  const active = !!q.trim() || filter !== auto || sort !== 'new'
  const showTools = events.length >= FILTER_MIN || active

  const matches = (e) => !q.trim() || e.title.toLowerCase().includes(q.trim().toLowerCase())
  const found = events.filter(matches)
  const rows = found
    .filter((e) => filter === 'all' || stageOf(e) === filter)
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
  const reset = () => {
    const next = new URLSearchParams(params)
    ;['q', 'status', 'sort'].forEach((k) => next.delete(k))
    setParams(next, { replace: true })
  }
  // 칩의 숫자는 검색어까지 반영한 건수다. (눌렀을 때 실제로 보게 될 수)
  const options = [['all', '전체', found.length], ...present.map((s) => [s, STAGE_LABEL[s], found.filter((e) => stageOf(e) === s).length])]

  return (
    <div className="stack">
      {showTools && (
        <div className="feed-tools">
          <div className="chips" role="group" aria-label="상태 필터">
            {options.map(([k, l, n]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => set('status', k, auto)}>{l} <span className="count">{n}</span></button>
            ))}
          </div>
          <div className="feed-bar">
            <div className="feed-count">
              <p className="muted" role="status">{rows.length}개의 공연</p>
              {active && <button type="button" className="link-btn" onClick={reset}>조건 초기화</button>}
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
        </div>
      )}
      <div className="event-grid">{rows.map(({ e, s }) => <EventCard key={e.id} event={e} stats={s} />)}</div>
      {rows.length === 0 && <Empty label="조건 초기화" onAction={active ? reset : undefined}>조건에 맞는 공연이 없습니다.</Empty>}
    </div>
  )
}
