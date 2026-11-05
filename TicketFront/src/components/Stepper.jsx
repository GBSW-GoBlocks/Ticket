import { stageOf } from '../lib/stage'
import { StatusBadge } from './ui'

const STEPS = [
  ['draft', '준비'],
  ['reserving', '예매 중'],
  ['closed', '예매 마감'],
  ['started', '공연 중'],
  ['finished', '종료'],
]

// O2: 주최자 관점 단계. 현재 단계는 aria-current="step", 지난 단계는 done.
export default function Stepper({ event }) {
  const stage = stageOf(event)
  if (stage === 'cancled') return <StatusBadge stage="cancled" />
  const at = STEPS.findIndex(([k]) => k === stage)
  return (
    <ol className="stepper" aria-label="진행 단계">
      {STEPS.map(([k, label], i) => (
        <li key={k} className={i < at ? 'done' : ''} aria-current={i === at ? 'step' : undefined}>
          {label}{i === at && <span className="sr-only"> (현재 단계)</span>}
        </li>
      ))}
    </ol>
  )
}
