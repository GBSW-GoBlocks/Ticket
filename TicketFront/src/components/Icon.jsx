// 하단 탭바용 선 아이콘(24px, currentColor). 라벨과 함께 쓴다.
const PATHS = {
  home: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
  events: <path d="M4 6h16M4 12h16M4 18h10" />,
  market: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  ticket: <path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h16v-2a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6H4v2zM14 6v12" />,
  account: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />,
}

export default function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
