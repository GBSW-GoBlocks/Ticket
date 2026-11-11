import { useState } from 'react'
import { useRole, useTx, useSellerRequests, useSellers } from '../lib/hooks'
import { Empty, PageHead, ConnectPrompt } from '../components/ui'
import { useAccount, useReadContract } from 'wagmi'
import { LIVE_READ } from '../lib/hooks'
import { ticketAbi } from '../lib/ticketAbi'
import { TICKET_ADDRESS } from '../lib/wagmi'
import { checkImageCid, toCid } from '../lib/ipfs'
import ImageField from '../components/ImageField'
import { ipfsUrls } from '../lib/ipfs'
import Field from '../components/Field'
import GuardedButton from '../components/GuardedButton'
import AddressText from '../components/AddressText'
import { checkAddress } from '../lib/validate'
import { useConfirm } from '../lib/confirm'
import { usePageTitle } from '../lib/title'

export default function Admin() {
  usePageTitle('관리자')
  const { address } = useAccount()
  const role = useRole()
  const { send, busy } = useTx()
  const ask = useConfirm()
  const { data: pending = [], isError: pendingFailed, refetch: retryPending } = useSellerRequests(role === 'owner')
  const { data: sellers = [], isError: sellersFailed } = useSellers(role === 'owner')
  const [addr, setAddr] = useState('')
  const [img, setImg] = useState('')
  const { data: currentImage } = useReadContract({ address: TICKET_ADDRESS, abi: ticketAbi, functionName: 'defaultImageIpfs', query: { enabled: role === 'owner', ...LIVE_READ } })

  if (!address) return <ConnectPrompt title="관리자">관리자 지갑을 연결하면 주최자 신청을 처리하고 기본 이미지를 바꿀 수 있습니다.</ConnectPrompt>
  if (role !== 'owner') return <><PageHead title="관리자" /><Empty>관리자 계정으로 연결해야 접근할 수 있습니다.</Empty></>
  const clean = addr.trim()
  const error = checkAddress(clean)
  const approve = async (a, label) => {
    if (await send('approveSellerRequest', [a], undefined, label)) setAddr('')
  }

  const revoke = async (a) => {
    if (await ask(`${a}\n이 주소의 주최자 권한을 회수합니다. 이미 만든 공연은 그대로 남습니다.`, { title: '권한을 회수할까요?', confirmLabel: '권한 회수', danger: true }))
      send('stripSeller', [a], undefined, `${a} 권한 회수`).then((ok) => ok && setAddr(''))
  }

  // 기본 이미지는 비울 수 없다. (이미지를 지정하지 않은 모든 공연이 쓰는 값)
  const imgError = !toCid(img) ? '이미지 CID를 입력하세요.' : checkImageCid(img)
  const saveImage = async () => {
    if (await send('setDefaultEventImage', [toCid(img)], undefined, '기본 이미지 변경')) setImg('')
  }

  return (
    <div className="stack narrow">
      <PageHead title="관리자">주최자 신청을 승인하거나 권한을 회수하고, 공연 기본 이미지를 바꿉니다.</PageHead>
      <section className="stack" aria-labelledby="adm-pending">
        <h2 id="adm-pending">승인 대기 {pending.length}건</h2>
        {pending.length > 0 && (
          <ul className="listbox">
            {pending.map((a) => (
              <li key={a}>
                <AddressText address={a} full />
                <GuardedButton busy={busy} aria-label={`${a} 승인`} onClick={() => send('approveSellerRequest', [a], undefined, `${a} 주최자 승인`)}>승인</GuardedButton>
              </li>
            ))}
          </ul>
        )}
        {pendingFailed && (
          <div role="alert" className="notice">
            <p>승인 대기 목록을 불러오지 못했습니다. RPC의 로그 조회 범위 제한일 수 있습니다. 신청이 없는 것이 아닐 수 있으니, 아래 "주소로 직접 처리"로 승인하거나 로그 조회용 RPC(VITE_LOGS_RPC_URL)를 설정하세요.</p>
            <button type="button" className="btn ghost" onClick={() => retryPending()}>다시 불러오기</button>
          </div>
        )}
        {!pendingFailed && pending.length === 0 && <Empty>승인 대기 중인 신청이 없습니다.</Empty>}
      </section>

      <section className="stack" aria-labelledby="adm-sellers">
        <h2 id="adm-sellers">승인된 주최자 {sellers.length}명</h2>
        {sellers.length > 0 && (
          <ul className="listbox">
            {sellers.map((a) => (
              <li key={a}>
                <AddressText address={a} full />
                <GuardedButton className="btn danger" busy={busy} aria-label={`${a} 권한 회수`} onClick={() => revoke(a)}>권한 회수</GuardedButton>
              </li>
            ))}
          </ul>
        )}
        {sellersFailed && <p role="alert" className="notice">승인된 주최자 목록을 불러오지 못했습니다. 로그 조회용 RPC(VITE_LOGS_RPC_URL)를 확인하세요.</p>}
        {!sellersFailed && sellers.length === 0 && <Empty>승인된 주최자가 없습니다.</Empty>}
      </section>

      <section className="panel" aria-labelledby="adm-direct">
        <h2 id="adm-direct">주소로 직접 처리</h2>
        <form className="form-row" noValidate onSubmit={(e) => { e.preventDefault(); if (!error) approve(clean, `${clean} 주최자 승인`) }}>
          <Field label="지갑 주소" hint="신청자가 알려준 주소를 입력하세요." error={error} value={addr} onChange={setAddr} placeholder="0x…" />
          <div className="form-actions">
            <GuardedButton type="submit" busy={busy} reason={error}>승인</GuardedButton>
            <GuardedButton className="btn danger" busy={busy} reason={error} onClick={() => revoke(clean)}>권한 회수</GuardedButton>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="adm-image">
        <h2 id="adm-image">공연 기본 이미지</h2>
        <p className="muted">이미지를 지정하지 않은 공연과 그 티켓(NFT)에 쓰입니다. 왼쪽은 지금 적용 중인 이미지입니다.</p>
        <form className="form-row" noValidate onSubmit={(e) => { e.preventDefault(); if (!imgError) saveImage() }}>
          <ImageField label="새 기본 이미지 CID" hint={`현재: ${currentImage || '…'}`} error={imgError} value={img} onChange={setImg} fallback={ipfsUrls(currentImage)} />
          <GuardedButton type="submit" busy={busy} reason={imgError}>기본 이미지 변경</GuardedButton>
        </form>
      </section>
    </div>
  )
}
