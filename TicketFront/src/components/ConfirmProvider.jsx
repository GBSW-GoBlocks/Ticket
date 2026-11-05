import { useCallback, useId, useRef, useState } from 'react'
import { ConfirmContext } from '../lib/confirm'

export default function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null)
  const ref = useRef(null)
  const titleId = useId()
  const bodyId = useId()

  const ask = useCallback(
    (message, opts = {}) =>
      new Promise((resolve) => {
        setReq({ message, ...opts, resolve })
        queueMicrotask(() => ref.current?.showModal())
      }),
    [],
  )

  const close = (ok) => {
    ref.current?.close()
    req?.resolve(ok)
    setReq(null)
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog ref={ref} className="dialog" aria-labelledby={titleId} aria-describedby={bodyId}
        onCancel={(e) => { e.preventDefault(); close(false) }}>
        <h2 id={titleId} className="dialog-title">{req?.title ?? '확인해주세요'}</h2>
        <p id={bodyId}>{req?.message}</p>
        <div className="row wrap end">
          <button className="btn ghost" autoFocus onClick={() => close(false)}>돌아가기</button>
          <button className={`btn ${req?.danger ? 'danger-fill' : ''}`} onClick={() => close(true)}>
            {req?.confirmLabel ?? '확인'}
          </button>
        </div>
      </dialog>
    </ConfirmContext.Provider>
  )
}
