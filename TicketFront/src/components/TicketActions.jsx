import { useState } from 'react'
import { parseEther } from 'viem'
import Field from './Field'
import GuardedButton from './GuardedButton'
import { checkEth } from '../lib/validate'
import { formatEth } from '../lib/format'
import { useConfirm } from '../lib/confirm'
import { isListed } from '../lib/stage'
import { confirmClaim, confirmRefund, confirmUse } from '../lib/confirmCopy'

// 보유자가 티켓에 대해 할 수 있는 동작 (행사 진행 상태와 티켓 상태에 따라 노출)
// onDone: 환불처럼 화면의 티켓이 사라지는 동작이 끝난 뒤 호출된다.
export default function TicketActions({ ticket, event, send, busy, onDone }) {
  const [price, setPrice] = useState('')
  const [formKey, setFormKey] = useState(0)
  const ask = useConfirm()
  const id = ticket.id
  const name = `티켓 #${id}`
  const cap = ticket.reservationPrice
  let priceError = checkEth(price)
  if (!priceError && parseEther(price.trim()) > cap) priceError = `최초 예매가(${formatEth(cap)} ETH) 이하로만 등록할 수 있습니다.`

  if (ticket.used) return <span className="muted">입장 완료된 티켓입니다.</span>

  if (isListed(ticket, event)) {
    return (
      <GuardedButton className="btn ghost" busy={busy} aria-label={`${name} 판매 중단`}
        onClick={() => send('ticketDownSale', [id], undefined, `${name} 판매 중단`)}>판매 중단</GuardedButton>
    )
  }

  const register = async () => {
    const ok = await send('ticketOnSale', [id, parseEther(price.trim())], undefined, `${name} 양도 등록 (${price.trim()} ETH)`)
    if (ok) {
      setPrice('')
      setFormKey((k) => k + 1)
    }
  }

  return (
    <>
      {event?.progress === 0 && !ticket.traded && (
        <GuardedButton className="btn ghost" busy={busy} aria-label={`${name} 환불`} onClick={async () => {
          if (await confirmRefund(ask, ticket, event)) {
            const ok = await send('refundTicket', [id], undefined, `${name} 환불 (${formatEth(ticket.reservationPrice)} ETH)`)
            if (ok) onDone?.()
          }
        }}>환불</GuardedButton>
      )}
      {event?.progress === 0 && ticket.traded && <span className="muted">양도받은 티켓은 환불할 수 없습니다.</span>}
      {event?.progress === 4 && !ticket.traded && (
        <GuardedButton busy={busy} aria-label={`${name} 환불 받기`} onClick={async () => {
          if (await confirmClaim(ask, ticket, event)) {
            const ok = await send('claimRefund', [id], undefined, `${name} 환불 받기 (${formatEth(ticket.reservationPrice)} ETH)`)
            if (ok) onDone?.()
          }
        }}>환불 받기</GuardedButton>
      )}
      {event?.progress === 4 && ticket.traded && <span className="muted">양도받은 티켓은 취소되어도 환불되지 않습니다.</span>}
      {event?.progress === 1 && event.reserved && (
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (!priceError) register() }} noValidate>
          <Field key={formKey} label="양도 판매가 (ETH)" hint={`최초 예매가 ${formatEth(cap)} ETH 이하만 등록할 수 있습니다.`} error={priceError}
            value={price} onChange={setPrice} placeholder="0.05" inputMode="decimal" />
          <GuardedButton type="submit" className="btn ghost" busy={busy} reason={priceError ? '판매가를 확인해주세요.' : ''}
            aria-label={`${name} 양도 등록`}>양도 등록</GuardedButton>
        </form>
      )}
      {event?.progress === 1 && !event.reserved && <span className="muted">예매가 마감되면 양도할 수 있습니다.</span>}
      {event?.progress === 2 && (
        <GuardedButton busy={busy} aria-label={`${name} 입장하기`} onClick={async () => {
          if (await confirmUse(ask, ticket, event)) send('useTicket', [id], undefined, `${name} 입장`)
        }}>입장하기</GuardedButton>
      )}
    </>
  )
}
