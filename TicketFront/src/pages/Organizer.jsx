import { useEffect, useRef, useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { useEvents, useRole, useTx, LIVE_READ } from '../lib/hooks'
import { ticketAbi } from '../lib/ticketAbi'
import { TICKET_ADDRESS } from '../lib/wagmi'
import { Empty, PageHead, ConnectPrompt } from '../components/ui'
import Stepper from '../components/Stepper'
import Field from '../components/Field'
import GuardedButton from '../components/GuardedButton'
import AddressText from '../components/AddressText'
import { StatusBadge } from '../components/ui'
import { same, formatEth } from '../lib/format'
import { checkEth, checkInt, checkText } from '../lib/validate'
import { actionBlock, stageOf, STAGE_LABEL } from '../lib/stage'
import { useConfirm } from '../lib/confirm'
import { MAX_EVENT_TICKETS, MAX_MINT_BATCH } from '../lib/limits'
import { usePageTitle } from '../lib/title'

const MAX_TITLE = 60

function EventPanel({ event, send, busy }) {
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [formKey, setFormKey] = useState(0)
  const ask = useConfirm()
  const stage = stageOf(event)
  const remain = event.maxMinted - event.minted
  const over = Number(amount.trim()) > remain ? (remain > 0 ? `남은 발행 가능 수량은 ${remain}장입니다.` : '이미 최대 수량을 모두 발행했습니다.') : ''
  const errA = checkInt(amount, '발행 수량') || (Number(amount) > MAX_MINT_BATCH ? `한 번에 최대 ${MAX_MINT_BATCH}장까지 발행할 수 있습니다.` : '') || over
  const errP = checkEth(price)
  const mintBlock = actionBlock('mint', event) || (errA || errP ? '수량과 가격을 확인해주세요.' : '')

  const step = (fn, label, confirm) => async () => {
    if (!confirm || (await ask(`${event.title}\n${confirm.message}`, { title: confirm.title, confirmLabel: label, danger: true }))) send(fn, [event.title], undefined, `${event.title} ${label}`)
  }
  const btn = (fn, label, confirm, cls = 'btn ghost') => (
    <GuardedButton className={cls} busy={busy} reason={actionBlock(fn, event)} aria-label={`${event.title} ${label}`}
      onClick={step(fn, label, confirm)}>{label}</GuardedButton>
  )

  const mint = async () => {
    const n = Number(amount.trim())
    const ok = await send('mintTicket', [event.title, BigInt(n), parseEther(price.trim())], undefined, `${event.title} 티켓 ${n}장 발행 (장당 ${price.trim()} ETH)`)
    if (ok) {
      setAmount('')
      setPrice('')
      setFormKey((k) => k + 1)
    }
  }

  const sold = event.maxMinted > 0 ? `발행 ${event.minted}/${event.maxMinted}장` : ''
  const body = (
    <>
      <Stepper event={event} />
      {stage === 'draft' && (
        <form className="form-row" noValidate onSubmit={(e) => { e.preventDefault(); if (!mintBlock) mint() }}>
          <Field key={`a${formKey}`} label="발행 수량" hint={`이번에 발행할 티켓 수 (최대 ${remain}장 더 발행 가능)`} error={errA} value={amount} onChange={setAmount} inputMode="numeric" />
          <Field key={`p${formKey}`} label="예매가 (ETH)" hint="티켓 1장 가격" error={errP} value={price} onChange={setPrice} inputMode="decimal" placeholder="0.05" />
          <GuardedButton type="submit" busy={busy} reason={mintBlock} aria-label={`${event.title} 티켓 발행`}>티켓 발행</GuardedButton>
        </form>
      )}
      {stage !== 'draft' && stage !== 'finished' && stage !== 'cancled' && (
        <p className="muted">티켓 발행은 예매를 시작하기 전(준비중)에만 할 수 있습니다.</p>
      )}
      {stage !== 'finished' && stage !== 'cancled' && (
        <div className="actions">
          {btn('startReservation', '예매 시작', { title: '예매를 시작할까요?', message: '예매를 시작하면 티켓을 더 발행할 수 없습니다.' })}
          {btn('finishReservation', '예매 마감', { title: '예매를 마감할까요?', message: `예매를 마감하면 판매되지 않은 티켓이 모두 소멸합니다. 되돌릴 수 없습니다.` })}
          {btn('startEvent', '공연 시작', { title: '공연을 시작할까요?', message: '공연을 시작하면 보관 중이던 예매금이 정산 가능 금액으로 옮겨지고, 예매자는 더 이상 환불받을 수 없습니다. 되돌릴 수 없습니다.' })}
          {btn('finishEvent', '공연 종료', { title: '공연을 종료할까요?', message: '공연을 종료하면 양도 중인 티켓의 판매가 중단됩니다.' })}
          {btn('cancleEvent', '행사 취소', { title: '행사를 취소할까요?', message: '행사를 취소하면 되돌릴 수 없습니다. 예매자는 "내 티켓"에서 직접 "환불 받기"를 눌러 예매금을 돌려받습니다. 양도된 티켓은 환불되지 않습니다.' }, 'btn danger')}
        </div>
      )}
    </>
  )

  // 종료·취소된 공연은 요약만 보이고, 펼쳐서 확인한다.
  if (stage === 'finished' || stage === 'cancled') {
    return (
      <li className="panel console-card" id={`ev-card-${event.id}`}>
        <details>
          <summary><span className="item-title">{event.title}</span> <StatusBadge event={event} /> <span className="muted">{sold}</span></summary>
          {body}
          <p className="muted">{STAGE_LABEL[stage]}된 공연입니다.</p>
        </details>
      </li>
    )
  }

  return (
    <li className="panel console-card" id={`ev-card-${event.id}`} tabIndex={-1}>
      <div className="row"><h3>{event.title}</h3><span className="muted">{sold}</span></div>
      {body}
    </li>
  )
}

export default function Organizer() {
  usePageTitle('주최자 콘솔')
  const { address } = useAccount()
  const role = useRole()
  const { data: events = [] } = useEvents()
  const { send, busy } = useTx()
  const [form, setForm] = useState({ title: '', max: '', own: '' })
  const [formKey, setFormKey] = useState(0)
  const set = (k) => (v) => setForm({ ...form, [k]: v })
  const title = form.title.trim()
  const knownIds = useRef(null)

  const read = (functionName, args) => ({ address: TICKET_ADDRESS, abi: ticketAbi, functionName, args, query: { enabled: !!address, ...LIVE_READ } })
  const { data: proceeds = 0n } = useReadContract(read('withdrawableBalance', [address]))
  const { data: status } = useReadContract(read('sellerStatus', [address]))

  const mine = events.filter((e) => same(e.registrant, address)).sort((a, b) => b.id - a.id)

  // 새 공연이 생기면 그 카드로 스크롤한다. 처음 로드된 공연은 대상이 아니다.
  useEffect(() => {
    if (events.length === 0) return
    const ids = new Set(events.filter((e) => same(e.registrant, address)).map((e) => e.id))
    const prev = knownIds.current
    knownIds.current = ids
    const fresh = prev && [...ids].find((id) => !prev.has(id))
    if (fresh === undefined || fresh === null || fresh === false) return
    requestAnimationFrame(() => {
      const el = document.getElementById(`ev-card-${fresh}`)
      el?.scrollIntoView({ block: 'center' })
      el?.focus?.()
    })
  }, [events, address])

  const errs = {
    title: checkText(title, '공연 제목') || (title.length > MAX_TITLE ? `제목은 ${MAX_TITLE}자 이하여야 합니다.` : '') ||
      (events.some((e) => e.title === title) ? '같은 제목의 공연이 이미 있습니다.' : ''),
    max: checkInt(form.max, '최대 발행량') || (Number(form.max) > MAX_EVENT_TICKETS ? `행사당 최대 ${MAX_EVENT_TICKETS}장까지 만들 수 있습니다.` : ''),
    own: checkInt(form.own, '지갑당 최대 보유') || (!checkInt(form.max, '') && Number(form.own) > Number(form.max) ? '지갑당 보유 한도는 최대 발행량 이하여야 합니다.' : ''),
  }
  const invalid = Object.values(errs).some(Boolean)

  if (!address) return <ConnectPrompt title="주최자 콘솔">지갑을 연결하면 공연을 등록하고 관리할 수 있습니다.</ConnectPrompt>
  if (role === 'owner') return <Empty>관리자 계정은 주최자 콘솔을 사용하지 않습니다. 주최자 승인은 "주최자 승인" 메뉴에서 합니다.</Empty>
  if (role === 'user') {
    const requested = status?.[1]
    return (
      <>
        <PageHead title="주최자 신청" />
        {requested ? (
          <div role="status">
            <p className="notice">신청이 접수되었습니다. 관리자가 승인하면 이 화면이 자동으로 공연 등록 화면으로 바뀝니다. (15초마다 확인)</p>
            <p className="muted">관리자에게 아래 주소로 신청했다고 알려주세요.</p>
            <AddressText address={address} full />
          </div>
        ) : (
          <>
            <p className="notice">공연을 등록하려면 주최자 권한이 필요합니다. 신청 후 관리자의 승인을 기다려주세요.</p>
            <GuardedButton busy={busy} onClick={() => send('requestSeller', [], undefined, '주최자 신청')}>주최자 신청</GuardedButton>
          </>
        )}
      </>
    )
  }

  const register = async () => {
    const ok = await send('addEvent', [title, BigInt(form.max.trim()), BigInt(form.own.trim())], undefined, `행사 "${title}" 등록`)
    if (ok) {
      setForm({ title: '', max: '', own: '' })
      setFormKey((k) => k + 1)
    }
  }

  return (
    <div className="stack">
      <PageHead title="주최자 콘솔">공연을 등록하고 단계별로 진행합니다.</PageHead>
      <section className="panel">
        <h2>정산</h2>
        <div className="row">
          <strong>{formatEth(proceeds)} ETH</strong>
          <GuardedButton busy={busy} reason={proceeds === 0n ? '정산 가능한 금액이 없습니다.' : ''}
            onClick={() => send('withdrawProceeds', [], undefined, `정산금 ${formatEth(proceeds)} ETH 출금`)}>출금</GuardedButton>
        </div>
        <p className="muted">예매금은 환불을 위해 공연이 시작되기 전까지 보관되며, 공연 시작 후 정산됩니다.</p>
      </section>

      <section className="panel">
        <h2>행사 등록</h2>
        <form className="form-row" noValidate onSubmit={(e) => { e.preventDefault(); if (!invalid) register() }}>
          <Field key={`t${formKey}`} required label="공연 제목" hint={`${MAX_TITLE}자 이하, 중복 제목은 등록할 수 없습니다.`} error={errs.title} value={form.title} onChange={set('title')} maxLength={MAX_TITLE} />
          <Field key={`m${formKey}`} required label="최대 발행량" hint="이 공연에서 발행 가능한 총 티켓 수" error={errs.max} value={form.max} onChange={set('max')} inputMode="numeric" />
          <Field key={`o${formKey}`} required label="지갑당 최대 보유" hint="한 지갑이 가질 수 있는 티켓 수 (최대 발행량 이하)" error={errs.own} value={form.own} onChange={set('own')} inputMode="numeric" />
          <GuardedButton type="submit" busy={busy} reason={invalid ? '입력값을 확인해주세요.' : ''}>등록</GuardedButton>
        </form>
      </section>

      <h2 style={{ marginTop: 'var(--s8)', marginBottom: 'var(--s4)' }}>내 공연 <span className="muted">(최신순 {mine.length}건)</span></h2>
      <ul className="stack">{mine.map((e) => <EventPanel key={e.id} event={e} send={send} busy={busy} />)}</ul>
      {mine.length === 0 && <Empty>등록한 공연이 없습니다. 위 "행사 등록"에서 첫 공연을 만들어보세요.</Empty>}
    </div>
  )
}
