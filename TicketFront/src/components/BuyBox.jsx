import { Link } from 'react-router-dom'
import GuardedButton from './GuardedButton'
import { Hint } from './ui'
import { formatEth } from '../lib/format'

// D1: 데스크톱은 우측 sticky 패널, 모바일은 하단 고정 바(CSS가 하나만 보이게 한다).
// Q: 공연 단계마다 알맞은 안내와 다음 행동(CTA)을 보여 준다. 정상 상태를 오류처럼 빨갛게 표시하지 않는다.
export default function BuyBox({ variant, stage, prices, soldOut, reason, busy, onBuy, resaleCount = 0, onShowResale }) {
  const hintId = `buy-hint-${variant}`
  const bar = variant === 'bar'
  let heading = '예매 안내'
  let summary // 가격이나 상태 요약
  let note = null
  let action = null
  let hint = ''

  if (stage === 'reserving') {
    heading = '예매 가격'
    if (prices) {
      const range = prices.min === prices.max ? formatEth(prices.min) : `${formatEth(prices.min)} ~ ${formatEth(prices.max)}`
      summary = <span className="price-big">{range} <small>ETH · 가스비 별도</small></span>
      note = prices.min === prices.max ? null : '가장 낮은 가격의 티켓부터 예매됩니다.'
      hint = reason
      action = (
        <GuardedButton className={`btn${bar ? '' : ' block'}`} reason={reason} busy={busy} describedBy={hintId} onClick={onBuy}>예매하기</GuardedButton>
      )
    } else {
      summary = <span className="muted">{soldOut ? '매진되었습니다.' : '예매 가능한 티켓이 없습니다.'}</span>
      action = resaleCount > 0 ? <button className={`btn ghost${bar ? '' : ' block'}`} onClick={onShowResale}>양도 티켓 {resaleCount}장 보기</button> : null
    }
  } else if (stage === 'draft') {
    summary = <span className="muted">아직 예매가 시작되지 않았습니다.</span>
  } else if (stage === 'closed') {
    summary = <span className="muted">예매가 마감되었습니다.</span>
    action = resaleCount > 0
      ? <button className={`btn${bar ? '' : ' block'}`} onClick={onShowResale}>양도 티켓 {resaleCount}장 보기</button>
      : <span className="meta">지금 양도 중인 티켓이 없습니다.</span>
  } else if (stage === 'started') {
    summary = <span className="muted">공연이 진행 중입니다. 입장은 내 티켓에서 하세요.</span>
    action = <Link className={`btn${bar ? '' : ' block'}`} to="/my">내 티켓 보기</Link>
  } else if (stage === 'finished') {
    summary = <span className="muted">종료된 공연입니다.</span>
  } else {
    summary = <span className="muted">취소된 공연입니다. 예매하셨다면 내 티켓에서 환불을 받을 수 있습니다.</span>
    action = <Link className={`btn${bar ? '' : ' block'}`} to="/my">내 티켓 보기</Link>
  }

  if (bar) {
    return (
      <div className="buy-bar" role="region" aria-label="예매">
        <div className="row">{summary}{action}</div>
        <Hint id={hintId}>{hint}</Hint>
      </div>
    )
  }
  return (
    <aside className="panel buy-panel" aria-label="예매">
      <h3>{heading}</h3>
      {summary}
      {stage === 'reserving' && prices && <p className="muted">결제 금액은 티켓 가격과 같고, 네트워크 수수료(가스비)가 별도로 지갑에서 청구됩니다.</p>}
      {note && <p className="muted">{note}</p>}
      {action}
      <Hint id={hintId}>{hint}</Hint>
      {stage === 'reserving' && prices && <p className="meta">블록체인 거래는 취소할 수 없습니다. 예매 기간 중에는 환불이 가능합니다.</p>}
    </aside>
  )
}
