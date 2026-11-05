import { useId, useState } from 'react'

// disabled 대신 aria-disabled를 써서 포커스를 유지한다.
// 막힌 버튼을 누르면(또는 Enter) 이유가 화면에 나타나고, 이유 텍스트는 aria-describedby 로 항상 연결된다.
// describedBy 를 직접 넘기면(다른 곳에 이유를 이미 보여 주는 경우) 자체 이유 표시는 하지 않는다.
export default function GuardedButton({ reason, busy, onClick, className = 'btn', describedBy, type = 'button', children, ...rest }) {
  const rid = useId()
  // 이유를 보여 준 문구를 기억한다. 사유가 바뀌거나 사라지면 다시 숨겨진다.
  const [shownFor, setShownFor] = useState('')
  const shown = !!reason && shownFor === reason
  const blocked = !!reason || !!busy
  const own = !!reason && !describedBy

  return (
    <>
      <button {...rest} type={type} className={`${className}${blocked ? ' is-disabled' : ''}`} aria-disabled={blocked}
        aria-describedby={reason ? (describedBy ?? rid) : undefined}
        onClick={(e) => {
          if (blocked) {
            e.preventDefault()
            if (reason) setShownFor(reason)
            return
          }
          onClick?.(e)
        }}>
        {children}
      </button>
      {own && <span id={rid} role={shown ? 'status' : undefined} className={shown ? 'hint-inline guard-reason' : 'sr-only'}>{reason}</span>}
    </>
  )
}
