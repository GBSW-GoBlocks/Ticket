import { useState } from 'react'
import { useRole, useTx, useSellerRequests } from '../lib/hooks'
import { Empty, PageHead, ConnectPrompt } from '../components/ui'
import { useAccount } from 'wagmi'
import Field from '../components/Field'
import GuardedButton from '../components/GuardedButton'
import AddressText from '../components/AddressText'
import { checkAddress } from '../lib/validate'
import { useConfirm } from '../lib/confirm'
import { usePageTitle } from '../lib/title'

export default function Admin() {
  usePageTitle('주최자 승인')
  const { address } = useAccount()
  const role = useRole()
  const { send, busy } = useTx()
  const ask = useConfirm()
  const { data: pending = [] } = useSellerRequests(role === 'owner')
  const [addr, setAddr] = useState('')

  if (!address) return <ConnectPrompt title="주최자 승인">관리자 지갑을 연결하면 주최자 신청을 처리할 수 있습니다.</ConnectPrompt>
  if (role !== 'owner') return <Empty>관리자 계정으로 연결해야 접근할 수 있습니다.</Empty>
  const clean = addr.trim()
  const error = checkAddress(clean)
  const approve = async (a, label) => {
    if (await send('approveSellerRequest', [a], undefined, label)) setAddr('')
  }

  const revoke = async (a) => {
    if (await ask(`${a}\n이 주소의 주최자 권한을 회수합니다. 이미 만든 공연은 그대로 남습니다.`, { title: '권한을 회수할까요?', confirmLabel: '권한 회수', danger: true }))
      send('stripSeller', [a], undefined, `${a} 권한 회수`).then((ok) => ok && setAddr(''))
  }

  return (
    <div className="stack">
      <PageHead title="주최자 승인">주최자 신청을 승인하거나 권한을 회수합니다.</PageHead>
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
        {pending.length === 0 && <Empty>승인 대기 중인 신청이 없습니다.</Empty>}
      </section>

      <section className="panel" aria-labelledby="adm-direct">
        <h2 id="adm-direct">주소로 직접 처리</h2>
        <form className="form-row" noValidate onSubmit={(e) => { e.preventDefault(); if (!error) approve(clean, `${clean} 주최자 승인`) }}>
          <Field label="지갑 주소" hint="신청자가 알려준 주소를 입력하세요." error={error} value={addr} onChange={setAddr} placeholder="0x…" />
          <GuardedButton type="submit" busy={busy} reason={error}>승인</GuardedButton>
          <GuardedButton className="btn danger" busy={busy} reason={error} onClick={() => revoke(clean)}>권한 회수</GuardedButton>
        </form>
      </section>
    </div>
  )
}
