import { useEffect } from 'react'

// 페이지마다 문서 제목을 갱신한다. (스크린리더·탭 구분)
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} – TICKET` : 'TICKET'
  }, [title])
}
