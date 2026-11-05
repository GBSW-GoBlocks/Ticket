import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/title'

export default function NotFound() {
  usePageTitle('페이지를 찾을 수 없습니다')
  return (
    <div className="empty">
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소가 잘못되었거나 삭제된 페이지입니다.</p>
      <Link className="btn" to="/">홈으로</Link>
    </div>
  )
}
