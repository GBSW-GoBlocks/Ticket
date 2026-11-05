import { useRef } from 'react'

// WAI-ARIA tabs: 좌우 방향키, Home/End 지원
export default function Tabs({ tabs, value, onChange, idPrefix }) {
  const refs = useRef([])
  const onKeyDown = (e, i) => {
    const last = tabs.length - 1
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(tabs[next].key)
    refs.current[next]?.focus()
  }
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t, i) => (
        <button key={t.key} ref={(el) => (refs.current[i] = el)} role="tab" id={`${idPrefix}-${t.key}`}
          aria-selected={value === t.key} aria-controls={`${idPrefix}-panel`} tabIndex={value === t.key ? 0 : -1}
          className={value === t.key ? 'on' : ''} onClick={() => onChange(t.key)} onKeyDown={(e) => onKeyDown(e, i)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
