import { Component } from 'react'

// 렌더 중 예외가 나도 흰 화면 대신 안내와 복귀 링크를 보여준다.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="empty" role="alert">
        <h1>문제가 발생했습니다</h1>
        <p>화면을 표시하는 중 오류가 났습니다. 홈으로 돌아가 다시 시도해주세요.</p>
        <a className="btn" href="/">홈으로</a>
      </div>
    )
  }
}
