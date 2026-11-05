import { Link } from 'react-router-dom'
import { useConnect } from 'wagmi'
import { STAGE_ICON, STAGE_LABEL, stageOf } from '../lib/stage'

// 공연 단계 칩. 색에만 의존하지 않도록 아이콘을 함께 쓴다. event 또는 stage 중 하나를 넘긴다.
export function StatusBadge({ event, stage }) {
  const st = stage ?? stageOf(event)
  return (
    <span className={`chip chip-${st}`}>
      <span aria-hidden="true">{STAGE_ICON[st]}</span> {STAGE_LABEL[st]}
    </span>
  )
}

export function SoldOutBadge() {
  return <span className="chip chip-soldout">매진</span>
}

// 빈 상태: 설명 + 다음 행동 1개
export function Empty({ children, to, label }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {to && <Link className="btn ghost" to={to}>{label}</Link>}
    </div>
  )
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="skeletons" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" />)}
    </div>
  )
}

// 비활성 사유 텍스트. 버튼의 aria-describedby 로 연결한다.
export function Hint({ id, children }) {
  return children ? <p id={id} className="hint">{children}</p> : null
}

export function PageHead({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </div>
  )
}

// 지갑이 없을 때: 제목 + 이유 + 지갑 연결 버튼
export function ConnectPrompt({ title, children }) {
  const { connect, connectors, isPending } = useConnect()
  return (
    <div className="stack">
      <PageHead title={title}>{children}</PageHead>
      <div>
        <button className="btn" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>지갑 연결</button>
      </div>
    </div>
  )
}
