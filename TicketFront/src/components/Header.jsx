import { useEffect, useRef } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { useRole } from '../lib/hooks'
import { chain, TICKET_ADDRESS } from '../lib/wagmi'
import { short, formatEth } from '../lib/format'
import AddressText from './AddressText'
import Icon from './Icon'
import ConnectButton from './ConnectButton'

const ROLE_LABEL = { owner: '관리자', seller: '주최자', user: '관람객' }

function roleLink(role) {
  if (role === 'owner') return { to: '/admin', label: '관리자' }
  return null
}

function WalletMenu({ role }) {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const ref = useRef(null)
  const extra = roleLink(role)

  const close = (restoreFocus) => {
    const el = ref.current
    if (!el?.open) return
    el.removeAttribute('open')
    if (restoreFocus) el.querySelector('summary')?.focus()
  }

  // Esc, 바깥 클릭, 포커스 이탈로 닫는다.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close(true)
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && close(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return (
    <details className="menu" ref={ref} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && close(false)}>
      <summary className="btn ghost">
        <span className="chip">{ROLE_LABEL[role] ?? '…'}</span> {short(address)}
      </summary>
      <div className="menu-panel">
        <p className="muted">네트워크 {chain.name}</p>
        <p>잔액 <strong>{balance ? formatEth(balance.value) : '…'} ETH</strong></p>
        <AddressText address={address} link />
        <Link className="menu-link" to="/account" onClick={() => close(false)}>내 계정</Link>
        {extra && <Link className="menu-link" to={extra.to} onClick={() => close(false)}>{extra.label}</Link>}
        <button className="menu-link" onClick={() => { close(false); disconnect() }}>연결 해제</button>
      </div>
    </details>
  )
}

// 데스크톱 헤더 검색: 공연 목록의 ?q= 로 이동한다. (모바일은 목록 화면의 검색칸을 쓴다)
function HeaderSearch() {
  const navigate = useNavigate()
  const submit = (e) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim()
    navigate(q ? `/events?q=${encodeURIComponent(q)}` : '/events')
  }
  return (
    <form className="hsearch" role="search" onSubmit={submit}>
      <label htmlFor="hsearch-q" className="sr-only">공연 검색</label>
      <input id="hsearch-q" name="q" type="search" placeholder="공연 제목 검색" autoComplete="off" />
    </form>
  )
}

export function Header() {
  const { isConnected } = useAccount()
  const role = useRole()
  const extra = roleLink(role)

  return (
    <header className="header">
      <div className="header-in">
        <NavLink to="/" className="logo">TICKET</NavLink>
        <nav className="nav" aria-label="주 메뉴">
          <NavLink to="/" end>홈</NavLink>
          <NavLink to="/events">공연</NavLink>
          <NavLink to="/market">티켓 2차 거래</NavLink>
          <NavLink to="/my">{role === 'seller' ? '주최 공연' : '내 티켓'}</NavLink>
          {extra && <NavLink to={extra.to}>{extra.label}</NavLink>}
        </nav>
        <HeaderSearch />
        <div className="wallet">
          {isConnected ? <WalletMenu role={role} /> : <ConnectButton />}
        </div>
      </div>
    </header>
  )
}

// 모바일 하단 탭바. 공연 상세에서는 CSS로 숨기고 예매 바가 대신한다.
export function TabBar() {
  const role = useRole()
  const items = [
    ['/', '홈', 'home'],
    ['/events', '공연', 'events'],
    ['/market', '2차 거래', 'market'],
    ['/my', role === 'seller' ? '주최 공연' : '내 티켓', 'ticket'],
    ['/account', '계정', 'account'],
  ]
  return (
    <nav className="tabbar" aria-label="하단 메뉴">
      {items.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === '/'}><Icon name={icon} />{label}</NavLink>
      ))}
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="footer on-ink">
      <div className="footer-in">
        <div className="footer-brand">
          <span className="logo">TICKET</span>
          <p>블록체인으로 예매하고 안전하게 양도하는 티켓</p>
        </div>
        <div className="footer-chain">
          <span>네트워크 {chain.name}</span>
          <span className="addr-text">티켓 발행 주소 <AddressText address={TICKET_ADDRESS} link /></span>
        </div>
      </div>
    </footer>
  )
}
