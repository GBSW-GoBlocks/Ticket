// 선 아이콘(24 격자, currentColor). 글자 크기를 따라가며(1em), 탭바에서는 CSS가 24px로 키운다.
// 문자 기호(⧉ ✕ ● 등)는 글꼴마다 모양이 달라 쓰지 않는다.
const PATHS = {
  home: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
  events: <path d="M4 6h16M4 12h16M4 18h10" />,
  market: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  ticket: <path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h16v-2a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6H4v2zM14 6v12" />,
  account: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />,
  copy: <path d="M9 9h10v11H9zM5 15V4h10" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  external: <path d="M14 5h5v5M19 5l-8 8M11 7H5v12h12v-6" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
  // 공연 단계: 모양만으로도 구분된다(색에 의존하지 않음).
  'stage-draft': <circle cx="12" cy="12" r="7" />,
  'stage-reserving': <circle cx="12" cy="12" r="7" fill="currentColor" />,
  'stage-closed': <><circle cx="12" cy="12" r="7" /><path d="M12 5a7 7 0 0 1 0 14z" fill="currentColor" /></>,
  'stage-started': <path d="M8 5l11 7-11 7z" fill="currentColor" />,
  'stage-finished': <rect x="6" y="6" width="12" height="12" fill="currentColor" />,
  'stage-cancled': <path d="M6 6l12 12M18 6L6 18" />,
}

export default function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
