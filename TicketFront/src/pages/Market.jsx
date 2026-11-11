import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEvents, useTickets, useTx, useWalletContext } from '../lib/hooks'
import { Empty, Skeleton, StatusBadge, PageHead } from '../components/ui'
import GuardedButton from '../components/GuardedButton'
import AddressText from '../components/AddressText'
import Poster from '../components/Poster'
import { same, formatEth } from '../lib/format'
import { ownedIn } from '../lib/stats'
import { resaleBlock } from '../lib/reasons'
import { priceGap } from '../lib/priceText'
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
    <div className="narrow">
      <PageHead title="티켓 2차 거래">예매가 마감된 공연의 양도 티켓입니다. 최초 예매가 이하로만 거래됩니다.</PageHead>
      <details className="note-fold">
        <summary>거래 전 확인</summary>
        <ul className="notes">
          <li>양도 가격은 최초 예매가를 넘을 수 없습니다.</li>
          <li>양도받은 티켓은 환불되지 않습니다.</li>
          <li>결제 금액은 티켓 가격과 같고, 네트워크 수수료(가스비)는 별도로 지갑에서 청구됩니다.</li>
          <li>블록체인 거래는 취소할 수 없습니다.</li>
        </ul>
      </details>
      <div className="toolbar">
        {withListing.length > 0 && withListing.length <= 6 ? (
          <div className="chips" role="group" aria-label="공연 필터">
            <button aria-pressed={eventId === 'all'} onClick={() => setParam('event', 'all', 'all')}>전체 {all.length}</button>
            {withListing.map((e) => (
              <button key={e.id} aria-pressed={eventId === String(e.id)} onClick={() => setParam('event', String(e.id), 'all')}>
                {e.title} {all.filter((r) => r.e.id === e.id).length}
              </button>
            ))}
          </div>
        ) : withListing.length > 6 ? (
          <div className="field">
            <label htmlFor={evId}>공연</label>
            <select id={evId} value={eventId} onChange={(e) => setParam('event', e.target.value, 'all')}>
              <option value="all">전체 ({all.length}건)</option>
              {withListing.map((e) => <option key={e.id} value={e.id}>{e.title} ({all.filter((r) => r.e.id === e.id).length}건)</option>)}
            </select>
          </div>
        ) : null}
        <div className="field sort-field">
          <label htmlFor={sortId} className="sr-only">정렬</label>
          <select id={sortId} value={sort} onChange={(e) => setParam('sort', e.target.value, 'id')}>
            <option value="id">최신 등록순</option>
            <option value="price">낮은 가격순</option>
          </select>
        </div>
      </div>
      <p className="muted" role="status">{rows.length}건의 양도 티켓</p>
      {isLoading && <Skeleton rows={3} />}
      {rows.length > 0 && (
        <ul className="resale-list">
          {rows.map(({ t, e }) => {
            const block = resaleBlock(ctx, e, t, ownedIn(tickets, e.id, ctx.address))
            const mine = same(t.owner, ctx.address)
            const gap = priceGap(t)
            return (
              <li key={t.id} className="resale-row">
                <Link to={`/events/${e.id}`} className="resale-thumb" aria-label={`${e.title} 공연 보기`}><Poster src={e.image} /></Link>
                <div className="resale-body">
                  <div className="chip-row"><StatusBadge event={e} />{gap && <span className={`chip chip-gap-${gap.tone}`}>{gap.text}</span>}</div>
                  <Link to={`/tickets/${t.id}`} className="item-title">{e.title} · #{t.id.toString()}</Link>
                  <p className="resale-price">{formatEth(t.price)} <small>ETH</small> <span className="muted">원가 {formatEth(t.reservationPrice)} ETH</span></p>
                  <p className="muted">판매자 {mine ? '나' : <AddressText address={t.owner} />}</p>
                </div>
                <div className="resale-buy">
                  <GuardedButton busy={busy} reason={block} describedBy={`mk-${t.id}`}
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
    </div>
  )
}
