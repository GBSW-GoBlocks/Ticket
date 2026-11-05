import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useAccount, useSwitchChain } from 'wagmi'
import { Header, TabBar, Footer } from './components/Header'
import ErrorBoundary from './components/ErrorBoundary'
import StatusBar from './components/StatusBar'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Market from './pages/Market'
import MyTickets from './pages/MyTickets'
import Organizer from './pages/Organizer'
import Admin from './pages/Admin'
import Account from './pages/Account'
import TicketDetail from './pages/TicketDetail'
import NotFound from './pages/NotFound'
import { TICKET_ADDRESS, chain } from './lib/wagmi'
import { useWrongChain } from './lib/hooks'
import { useToast } from './lib/toast'

// 페이지 위에 고정되는 안내 배너: 컨트랙트 주소 미설정, 지갑 네트워크 불일치
function Banner() {
  const { chain: current } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrong = useWrongChain()
  const unset = !/^0x[0-9a-fA-F]{40}$/.test(TICKET_ADDRESS ?? '') || /^0x0+$/.test(TICKET_ADDRESS)

  if (unset) return <div className="banner" role="alert">.env의 VITE_TICKET_ADDRESS에 배포된 컨트랙트 주소를 설정해주세요.</div>
  if (!wrong) return null
  return (
    <div className="banner" role="alert">
      <span>지갑이 {current?.name ?? '다른'} 네트워크에 연결되어 있습니다. 이 앱은 {chain.name} 네트워크에서 동작합니다.</span>
      <button className="btn" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>{chain.name}(으)로 전환</button>
    </div>
  )
}

// 화면 이동 시: 끝난 알림 정리, 스크롤 초기화, 새 화면의 제목(h1)으로 포커스 이동
function RouteEffects() {
  const { pathname } = useLocation()
  const { clearSettled } = useToast()
  const first = useRef(true)

  useEffect(() => {
    clearSettled()
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo(0, 0)
    const h1 = document.querySelector('main h1')
    if (h1) {
      h1.setAttribute('tabindex', '-1')
      h1.focus({ preventScroll: true })
    }
  }, [pathname, clearSettled])
  return null
}

export default function App() {
  return (
    <div className="app">
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <Banner />
      <Header />
      <RouteEffects />
      <main id="main" className="page">
        <StatusBar />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/market" element={<Market />} />
            <Route path="/my" element={<MyTickets />} />
            <Route path="/organizer" element={<Organizer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/account" element={<Account />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <TabBar />
    </div>
  )
}
