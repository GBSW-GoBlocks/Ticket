import { Link } from 'react-router-dom'
import { STAGE_LABEL, stageOf } from '../lib/stage'
import ConnectButton from './ConnectButton'
import { hasWallet } from '../lib/wallet'
import Icon from './Icon'

// 공연 단계 칩. 색에만 의존하지 않도록 아이콘을 함께 쓴다. event 또는 stage 중 하나를 넘긴다.
export function StatusBadge({ event, stage }) {
  const st = stage ?? stageOf(event)
  return (
    <span className={`chip chip-${st}`}>
      <Icon name={`stage-${st}`} /> {STAGE_LABEL[st]}
    </span>
  )
}

export function SoldOutBadge() {
  return <span className="chip chip-soldout">매진</span>
}

// 빈 상태: 설명 + 다음 행동 1개 (링크 또는 버튼)
export function Empty({ children, to, label, onAction }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {to && <Link className="btn ghost" to={to}>{label}</Link>}
      {!to && onAction && <button className="btn ghost" onClick={onAction}>{label}</button>}
    </div>
  )
}

// 로딩 자리 표시. 실제 화면과 같은 모양으로 잡아 내용이 들어올 때 화면이 밀리지 않게 한다.
// kind: 'rows'(목록 줄) | 'cards'(포스터 카드 격자) | 'stubs'(티켓 스텁)
export function Skeleton({ rows = 3, kind = 'rows' }) {
  const items = Array.from({ length: rows }, (_, i) => i)
  if (kind === 'cards') {
    return (
      <div className="event-grid" aria-busy="true" aria-label="불러오는 중">
        {items.map((i) => (
          <div key={i} className="event-card is-skeleton">
            <div className="poster-box"><div className="poster skeleton" /></div>
            <div className="meta-box"><div className="skeleton line" /><div className="skeleton line short" /></div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="skeletons" aria-busy="true" aria-label="불러오는 중">
      {items.map((i) => <div key={i} className={`skeleton${kind === 'stubs' ? ' stub-skeleton' : ''}`} />)}
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
  return (
    <div className="stack">
      <PageHead title={title}>{children}</PageHead>
      <div><ConnectButton /></div>
      {!hasWallet() && (
        <p className="muted">
          지갑이 처음이라면 <a className="text-link" href="https://metamask.io/download/" target="_blank" rel="noreferrer">MetaMask 설치 안내<Icon name="external" /><span className="sr-only"> (새 창)</span></a>를 참고하세요. 설치 후 이 화면을 새로고침하면 연결할 수 있습니다.
        </p>
      )}
    </div>
  )
}
