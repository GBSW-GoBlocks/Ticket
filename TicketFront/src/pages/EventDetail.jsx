import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatEther } from 'viem'
import { useEvents, useTickets, useTx, useWalletContext } from '../lib/hooks'
import { StatusBadge, SoldOutBadge, Empty, Skeleton, Hint } from '../components/ui'
import AddressText from '../components/AddressText'
import Tabs from '../components/Tabs'
import GuardedButton from '../components/GuardedButton'
import BuyBox from '../components/BuyBox'
import { same, formatEth, parseId } from '../lib/format'
import { ownedIn } from '../lib/stats'
import { reserveBlock, resaleBlock } from '../lib/reasons'
import { STAGE_LABEL, stageOf, isListed } from '../lib/stage'
import { usePageTitle } from '../lib/title'
import { useConfirm } from '../lib/confirm'
import { confirmReserve, confirmResale } from '../lib/confirmCopy'
import TicketRow from '../components/TicketRow'

const NOTICES = [
  '티켓은 직접 전송할 수 없으며, 양도는 티켓 2차 거래를 통해서만 가능합니다.',
  '예매 기간 중에는 구매 금액 전액을 환불받을 수 있습니다. 양도받은 티켓은 환불되지 않습니다.',
  '양도 등록 가격은 최초 예매가를 초과할 수 없습니다.',
  '예매 마감 시 판매되지 않은 티켓은 소멸합니다.',
  '행사가 취소되면 최초 예매자는 "내 티켓"에서 "환불 받기"로 예매금을 환불받습니다. 양도받은 티켓은 환불되지 않습니다.',
  '예매금은 공연이 시작되기 전까지 환불을 위해 보관되며, 주최자가 먼저 가져갈 수 없습니다.',
  '주최자 계정으로는 티켓을 구매할 수 없습니다.',
]

// 지금 상태에서 사용자가 알아야 할 것
const NOW = {
  draft: '아직 예매가 시작되지 않았습니다.',
  reserving: '예매 기간입니다. 예매한 티켓은 이 기간에 환불할 수 있습니다.',
  closed: '예매가 마감되었습니다. 이제 환불은 되지 않고, 양도 티켓 탭에서 다른 사람이 내놓은 티켓을 살 수 있습니다.',
  started: '공연이 진행 중입니다. 내 티켓에서 입장 처리를 할 수 있습니다.',
  finished: '종료된 공연입니다.',
  cancled: '취소된 공연입니다. 예매하셨다면 내 티켓에서 "환불 받기"로 예매금을 돌려받으세요.',
}

export default function EventDetail() {
  const id = parseId(useParams().id)
  const ctx = useWalletContext()
  const ask = useConfirm()
  const { data: events = [], isLoading } = useEvents()
  const { data: tickets = [] } = useTickets()
  const { send, busy } = useTx()
  const [tab, setTab] = useState('info')

  const event = id ? events.find((e) => e.id === Number(id)) : null
  usePageTitle(event?.title ?? '공연')
  if (!event) return isLoading ? <Skeleton rows={2} /> : <Empty to="/events" label="공연 목록으로">공연을 찾을 수 없습니다.</Empty>

  const stage = stageOf(event)
  const list = tickets.filter((t) => t.eventId === event.id)
  // 가장 싼 티켓부터 보여주고, 대표 가격(예매 패널)도 최저가로 맞춘다. (카드의 최저가와 일치)
  const open = list
    .filter((t) => same(t.owner, event.registrant) && isListed(t, event) && event.progress === 0)
    .sort((a, b) => (a.price === b.price ? Number(a.id - b.id) : a.price < b.price ? -1 : 1))
  const resale = list.filter((t) => !same(t.owner, event.registrant) && isListed(t, event))
  const first = open[0]
  const prices = open.length ? { min: open[0].price, max: open[open.length - 1].price } : null
  const isRegistrant = same(ctx.address, event.registrant)
  const owned = ownedIn(tickets, event.id, ctx.address)
  const buyBlock = reserveBlock(ctx, event, { hasTicket: !!first, owned })
  const soldOut = event.progress === 0 && open.length === 0

  const reserve = async (t) => {
    if (!(await confirmReserve(ask, t, event))) return
    send('reserveTicket', [t.id], t.price, `티켓 #${t.id} 예매 (${formatEth(t.price)} ETH)`, { action: { to: '/my', label: '내 티켓 보기' } })
  }
  const buyResale = async (t) => {
    if (!(await confirmResale(ask, t, event))) return
    send('buyTicket', [t.id], t.price, `티켓 #${t.id} 양도 구매 (${formatEth(t.price)} ETH)`, { action: { to: '/my', label: '내 티켓 보기' } })
  }
  const showResale = () => {
    setTab('resale')
    requestAnimationFrame(() => {
      document.getElementById('ev-panel')?.scrollIntoView({ block: 'start' })
      document.getElementById('ev-resale')?.focus()
    })
  }
  const boxProps = { stage, prices, soldOut, reason: buyBlock, busy, onBuy: () => reserve(first), resaleCount: resale.length, onShowResale: showResale }

  return (
    <>
      <p className="crumb"><Link to="/events">공연</Link> › {event.title}</p>
      <div className="detail">
        <div className="poster-wrap"><div className="poster" aria-hidden="true" /></div>
        <div className="detail-info">
          <div className="chip-row">{soldOut ? <SoldOutBadge /> : <StatusBadge event={event} />}</div>
          <h1>{event.title}</h1>
          <dl className="kv">
            <dt>주최</dt><dd><AddressText address={event.registrant} /></dd>
            <dt>진행 단계</dt><dd>{STAGE_LABEL[stage]}</dd>
            <dt>발행</dt><dd>{event.minted}장 / 최대 {event.maxMinted}장</dd>
            <dt>현재 유통</dt><dd>{list.length}장 (예매 가능 {open.length} · 양도 중 {resale.length})</dd>
            <dt>지갑당 한도</dt>
            <dd>최대 {event.maxOwnable}장{ctx.address && (isRegistrant ? ` · 주최자 미판매 재고 ${owned}장` : ` · 내 보유 ${owned}장`)}</dd>
          </dl>
        </div>
        <BuyBox variant="panel" {...boxProps} />
      </div>

      <div className="after-section stack">
        <Tabs idPrefix="ev" value={tab} onChange={setTab}
          tabs={[{ key: 'info', label: '공연 정보' }, { key: 'tickets', label: `예매 티켓 ${open.length}` }, { key: 'resale', label: `양도 티켓 ${resale.length}` }]} />

        <div role="tabpanel" id="ev-panel" aria-labelledby={`ev-${tab}`}>
          {tab === 'info' && (
            <div className="stack">
              <p className="notice" role="note"><strong>지금 상태</strong> {NOW[stage]}</p>
              <h2>예매 유의사항</h2>
              <ul className="notes">{NOTICES.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
          {tab === 'tickets' && (
            <div className="stack">
              <ul className="listbox">
                {open.map((t) => (
                  <TicketRow key={t.id} ticket={t} event={event}>
                    <Link className="btn ghost" to={`/tickets/${t.id}`} aria-label={`티켓 #${t.id} 상세`}>상세</Link>
                    <GuardedButton reason={reserveBlock(ctx, event, { owned })} busy={busy}
                      aria-label={`${formatEther(t.price)} ETH 예매, 티켓 #${t.id}`} onClick={() => reserve(t)}>
                      {formatEther(t.price)} ETH 예매
                    </GuardedButton>
                  </TicketRow>
                ))}
              </ul>
              <Hint>{open.length ? reserveBlock(ctx, event, { owned }) : ''}</Hint>
              {open.length === 0 && <Empty>예매 가능한 티켓이 없습니다.</Empty>}
            </div>
          )}
          {tab === 'resale' && (
            <div className="stack">
              <ul className="listbox">
                {resale.map((t) => {
                  const block = resaleBlock(ctx, event, t, owned)
                  return (
                    <TicketRow key={t.id} ticket={t} event={event}>
                      <Link className="btn ghost" to={`/tickets/${t.id}`} aria-label={`티켓 #${t.id} 상세`}>상세</Link>
                      <GuardedButton reason={block} busy={busy} describedBy={`rs-${t.id}`}
                        aria-label={`${formatEth(t.price)} ETH 구매, 티켓 #${t.id}`} onClick={() => buyResale(t)}>
                        {formatEth(t.price)} ETH 구매
                      </GuardedButton>
                      {block && <span id={`rs-${t.id}`} className="hint-inline">{block}</span>}
                    </TicketRow>
                  )
                })}
              </ul>
              {resale.length === 0 && <Empty>양도 중인 티켓이 없습니다.</Empty>}
            </div>
          )}
        </div>
      </div>
      <BuyBox variant="bar" {...boxProps} />
    </>
  )
}
