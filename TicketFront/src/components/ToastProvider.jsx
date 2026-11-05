import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext, ToastItemsContext } from '../lib/toast'

const OK_MS = 8000

// 알림 상태만 관리한다. 화면 표시는 StatusBar 가 맡는다.
// 진행·오류는 흐름 안 막대(사용자가 닫거나 새 요청이 시작될 때까지 유지), 성공만 토스트(자동 닫힘, 호버·포커스 시 정지)
export default function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)
  const timers = useRef(new Map())

  const stop = (id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }

  const dismiss = useCallback((id) => {
    stop(id)
    setItems((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const schedule = useCallback((id) => {
    stop(id)
    timers.current.set(id, setTimeout(() => dismiss(id), OK_MS))
  }, [dismiss])

  const push = useCallback((t) => {
    const id = ++seq.current
    setItems((xs) => {
      const dup = xs.find((x) => x.kind === t.kind && x.text === t.text && t.kind !== 'info')
      return dup ? xs : [...xs, { id, ...t }]
    })
    if (t.kind === 'ok') schedule(id)
    return id
  }, [schedule])

  const update = useCallback((id, patch) => {
    setItems((xs) => {
      const next = { ...xs.find((x) => x.id === id), ...patch }
      const dup = xs.find((x) => x.id !== id && x.kind === next.kind && x.text === next.text && next.kind !== 'info')
      return dup ? xs.filter((x) => x.id !== id) : xs.map((x) => (x.id === id ? next : x))
    })
    if (patch.kind === 'ok') schedule(id)
  }, [schedule])

  // 화면 이동 시 지난 오류만 정리한다. 진행 중 알림과 성공 토스트(환불 직후 이동 등)는 남긴다.
  const clearSettled = useCallback(() => setItems((xs) => xs.filter((x) => x.kind !== 'error')), [])
  // 새 요청이 시작되면 이전 오류는 지운다.
  const clearErrors = useCallback(() => setItems((xs) => xs.filter((x) => x.kind !== 'error')), [])

  const api = useMemo(
    () => ({ push, update, dismiss, clearSettled, clearErrors, pause: stop, resume: schedule }),
    [push, update, dismiss, clearSettled, clearErrors, schedule],
  )

  return (
    <ToastContext.Provider value={api}>
      <ToastItemsContext.Provider value={items}>{children}</ToastItemsContext.Provider>
    </ToastContext.Provider>
  )
}
