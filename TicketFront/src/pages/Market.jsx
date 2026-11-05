import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEvents, useTickets, useTx, useWalletContext } from '../lib/hooks'
import { Empty, Skeleton, StatusBadge, PageHead } from '../components/ui'
import GuardedButton from '../components/GuardedButton'
import AddressText from '../components/AddressText'
import { same, formatEth } from '../lib/format'
import { ownedIn } from '../lib/stats'
import { resaleBlock } from '../lib/reasons'
import { usePageTitle } from '../lib/title'
import { useConfirm } from '../lib/confirm'
import { confirmResale } from '../lib/confirmCopy'

export default function Market() {
  usePageTitle('티켓 2차 거래')
  const ctx = useWalletContext()
  const ask = useConfirm()
  const { data: events = [] } = useEvents()
  const { data: tickets = [], isLoading } = useTickets()
  const { send, busy } = useTx()
  const [params, setParams] = useSearchParams()
  const evId = useId()
  const sortId = useId()

  // 구매 가능한 양도 매물만: 예매 마감 후 공연 시작 전, 최초 예매자가 아닌 보유자의 판매 등록
  const all = tickets
    .map((t) => ({ t, e: events.find((e) => e.id === t.eventId) }))
    .filter(({ t, e }) => e && t.onSale && !same(t.owner, e.registrant) && e.progress === 1 && e.reserved)
  // 공연 필터에는 양도 매물이 있는 공연만 건수와 함께 보여 준다.
  const withListing = events.filter((e) => all.some((r) => r.e.id === e.id))
  const picked = params.get('event')
  const eventId = picked && withListing.some((e) => String(e.id) === picked) ? picked : 'all'
  const sort = params.get('sort') === 'price' ? 'price' : 'id'

  const rows = all
    .filter(({ e }) => eventId === 'all' || e.id === Number(eventId))
    .sort((a, b) => (sort === 'price' ? (a.t.price < b.t.price ? -1 : 1) : Number(b.t.id - a.t.id)))

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const buy = async (t, e) => {
    if (!(await confirmResale(ask, t, e))) return
    send('buyTicket', [t.id], t.price, `티켓 #${t.id} 양도 구매 (${formatEth(t.price)} ETH)`, { action: { to: '/my', label: '내 티켓 보기' } })
  }

  return (
    <>
      <PageHead title="티켓 2차 거래">예매가 마감된 공연의 양도 티켓입니다. 최초 예매가 이하로만 거래됩니다.</PageHead>
      <div className="toolbar">
        <div className="field">
          <label htmlFor={evId}>공연</label>
          <select id={evId} value={eventId} onChange={(e) => setParam('event', e.target.value, 'all')}>
            <option value="all">전체 ({all.length}건)</option>
            {withListing.map((e) => <option key={e.id} value={e.id}>{e.title} ({all.filter((r) => r.e.id === e.id).length}건)</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={sortId}>정렬</label>
          <select id={sortId} value={sort} onChange={(e) => setParam('sort', e.target.value, 'id')}>
            <option value="id">티켓 번호 높은 순</option>
            <option value="price">낮은 가격순</option>
          </select>
        </div>
        <p className="muted" role="status">{rows.length}건</p>
        {eventId !== 'all' && <button className="btn ghost" onClick={() => setParam('event', 'all', 'all')}>필터 초기화</button>}
      </div>
      {isLoading && <Skeleton rows={3} />}
      {rows.length > 0 && (
        <ul className="listbox">
          {rows.map(({ t, e }) => {
            const block = resaleBlock(ctx, e, t, ownedIn(tickets, e.id, ctx.address))
            const mine = same(t.owner, ctx.address)
            return (
              <li key={t.id}>
                <div>
                  <div><span className="item-title">#{t.id.toString()} · {e.title}</span> <StatusBadge event={e} /></div>
                  <div>{formatEth(t.price)} ETH <span className="muted">(원가 {formatEth(t.reservationPrice)} ETH)</span></div>
                  <div className="muted">판매자 {mine ? '나' : <AddressText address={t.owner} />}</div>
                </div>
                <div className="actions">
                  <Link className="btn ghost" to={`/events/${e.id}`} aria-label={`${e.title} 공연 보기`}>공연 보기</Link>
                  <GuardedButton reason={block} busy={busy} describedBy={`mk-${t.id}`}
                    aria-label={`${formatEth(t.price)} ETH 구매, 티켓 #${t.id}`} onClick={() => buy(t, e)}>
                    {formatEth(t.price)} ETH 구매
                  </GuardedButton>
                  {block && <span id={`mk-${t.id}`} className="hint-inline">{block}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {!isLoading && rows.length === 0 && (
        <Empty to={eventId !== 'all' ? undefined : '/events'} label="공연 둘러보기">
          {eventId !== 'all' ? '이 공연에는 양도 중인 티켓이 없습니다. "필터 초기화"를 눌러보세요.' : '구매할 수 있는 양도 티켓이 없습니다.'}
        </Empty>
      )}
    </>
  )
}
