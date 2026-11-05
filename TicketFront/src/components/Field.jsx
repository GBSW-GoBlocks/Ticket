import { useId, useState } from 'react'

// 항상 보이는 라벨 + 입력 후 인라인 검증 메시지
export default function Field({ label, hint, error, value, onChange, required, ...rest }) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const showError = (touched || value) && error
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span className="req"> (필수)</span>}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setTouched(true)}
        required={required} aria-required={required} aria-invalid={!!showError} aria-describedby={`${id}-d`} {...rest} />
      <small id={`${id}-d`} className={showError ? 'err' : 'muted'}>{showError ? error : hint}</small>
    </div>
  )
}
