import { Link } from 'react-router-dom'
import { useAccount, useBalance, useDisconnect, useReadContract } from 'wagmi'
import { useActivity, useEvents, useRole, useTickets, useTx } from '../lib/hooks'
import { ticketAbi } from '../lib/ticketAbi'
import { TICKET_ADDRESS, chain } from '../lib/wagmi'
import { PageHead, ConnectPrompt } from '../components/ui'
import AddressText from '../components/AddressText'
import GuardedButton from '../components/GuardedButton'
import { same, formatEth } from '../lib/format'
import { splitMine } from '../lib/stats'
import { usePageTitle } from '../lib/title'
import { isListed } from '../lib/stage'
import { LIVE_READ } from '../lib/hooks'

const KIND = { reserve: '예매', buy: '양도 구매', sell: '양도 판매', refund: '환불' }
const ROLE_LABEL = { owner: '관리자', seller: '주최자', user: '관람객' }

export default function Account() {
  usePageTitle('내 계정')
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const role = useRole()
  const { send, busy } = useTx()
  const { data: events = [] } = useEvents()
  const { data: tickets = [] } = useTickets()
  const { data: balance } = useBalance({ address })
  const { data: activity = [] } = useActivity(address)
  const read = (functionName, args) => ({
    address: TICKET_ADDRESS, abi: ticketAbi, functionName, args, query: { enabled: !!address, ...LIVE_READ },
  })
  const { data: proceeds = 0n } = useReadContract(read('withdrawableBalance', [address]))
  const { data: status } = useReadContract(read('sellerStatus', [address]))

  if (!isConnected) return <ConnectPrompt title="내 계정">지갑을 연결하면 계정 정보를 볼 수 있습니다.</ConnectPrompt>

  const { held, stock } = splitMine(tickets, events, address)
  const selling = held.filter((t) => isListed(t, events.find((e) => e.id === t.eventId)))
  const myEvents = events.filter((e) => same(e.registrant, address))
  const requested = status?.[1]
  const showProceeds = role === 'seller' || proceeds > 0n

  return (
    <div className="stack narrow">
      <PageHead title="내 계정" />
      <section className="panel profile" aria-label="지갑 정보">
        <div className="avatar" aria-hidden="true" />
        <div className="profile-body">
          <span className="chip-row"><span className="chip">{ROLE_LABEL[role] ?? '…'}</span></span>
          <AddressText address={address} full link />
          <p className="muted">네트워크 {chain.name} · 잔액 {balance ? formatEth(balance.value) : '…'} ETH</p>
        </div>
        <button className="btn ghost" onClick={() => disconnect()}>연결 해제</button>
      </section>

      <div className="stats">
        <Link to="/my" className="stat"><span>보유 티켓</span><strong>{held.length}</strong></Link>
        <Link to="/my" className="stat"><span>양도 중</span><strong>{selling.length}</strong></Link>
        {role === 'seller' && <Link to="/my" className="stat"><span>내 공연</span><strong>{myEvents.length}</strong></Link>}
        {role === 'seller' && <div className="stat"><span>미판매 재고</span><strong>{stock.length}</strong></div>}
        {showProceeds && <div className="stat"><span>정산 가능</span><strong>{formatEth(proceeds)} ETH</strong></div>}
      </div>

      <div className="actions">
        {showProceeds && (
          <GuardedButton busy={busy} reason={proceeds === 0n ? '정산 가능한 금액이 없습니다. 예매금은 공연 시작 후 정산됩니다.' : ''}
            describedBy="acc-hint" onClick={() => send('withdrawProceeds', [], undefined, '정산금 출금')}>정산금 출금</GuardedButton>
        )}
        {role === 'user' && !requested && <GuardedButton busy={busy} onClick={() => send('requestSeller', [], undefined, '주최자 신청')}>주최자 신청하기</GuardedButton>}
        {role === 'user' && requested && <span className="notice" role="status">주최자 신청이 접수되었습니다. 관리자 승인을 기다려주세요.</span>}
      </div>
      {role === 'seller' && proceeds === 0n && <p id="acc-hint" className="muted">정산 가능한 금액이 없습니다. 예매금은 공연 시작 후 정산됩니다.</p>}

      <section className="section" aria-labelledby="acc-activity">
        <h2 id="acc-activity">최근 거래</h2>
        {activity.length > 0 ? (
          <ul className="listbox">
            {activity.map((a) => {
              const t = tickets.find((x) => x.id === a.ticketId)
              const e = t && events.find((x) => x.id === t.eventId)
              return (
                <li key={a.key}>
                  <div>
                    <span className="item-title">{KIND[a.kind]} · 티켓 #{a.ticketId.toString()}</span>
                    <span className="muted"> · {e?.title ?? '소각된 티켓'}</span>
                    <div className="muted">{formatEth(a.amount)} ETH · {a.time ? new Date(a.time).toLocaleString('ko-KR') : ''}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <p className="muted">아직 거래 내역이 없습니다.</p>}
      </section>
    </div>
  )
}
