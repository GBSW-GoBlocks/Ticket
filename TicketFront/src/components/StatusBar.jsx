import { Link } from 'react-router-dom'
import { useToast, useToastItems } from '../lib/toast'
import Icon from './Icon'

// 거래 진행 단계. 문구(낭독 대상)는 그대로 두고, 어디까지 왔는지만 눈으로 보이게 한다.
const TX_STEPS = ['확인', '서명', '기록']

// 본문 맨 위(DOM 순서도 맨 위)에 둔다. 키보드로 닿기 쉽고, 항상 존재하는 live 영역이라 낭독이 누락되지 않는다.
export default function StatusBar() {
  const items = useToastItems()
  const { dismiss, pause, resume } = useToast()
  const info = items.filter((t) => t.kind === 'info')
  const errors = items.filter((t) => t.kind === 'error')
  const toasts = items.filter((t) => t.kind === 'ok')

  return (
    <>
      <div className="statusbar" aria-label="진행 상태">
        <div role="status" aria-live="polite">
          {info.map((t) => (
            <div key={t.id} className="status status-info">
              <span>{t.text}{t.link && <> <a href={t.link} target="_blank" rel="noreferrer">탐색기에서 보기</a></>}</span>
              {t.step && (
                <ol className="tx-steps" aria-hidden="true">
                  {TX_STEPS.map((s, i) => <li key={s} className={i + 1 < t.step ? 'done' : i + 1 === t.step ? 'now' : ''}>{i + 1}. {s}</li>)}
                </ol>
              )}
            </div>
          ))}
        </div>
        <div role="alert">
          {errors.map((t) => (
            <div key={t.id} className="status status-error">
              <span>{t.text}</span>
              <button className="icon-btn sm" aria-label="알림 닫기" onClick={() => dismiss(t.id)}><Icon name="close" /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="toasts" role="status" aria-live="polite" aria-label="알림">
        {toasts.map((t) => (
          <div key={t.id} className="toast"
            onMouseEnter={() => pause(t.id)} onMouseLeave={() => resume(t.id)}
            onFocus={() => pause(t.id)} onBlur={() => resume(t.id)}>
            <span>
              {t.text}
              {t.action && <> <Link to={t.action.to} onClick={() => dismiss(t.id)}>{t.action.label}</Link></>}
            </span>
            <button className="icon-btn sm" aria-label="알림 닫기" onClick={() => dismiss(t.id)}><Icon name="close" /></button>
          </div>
        ))}
      </div>
    </>
  )
}
