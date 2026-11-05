import { zeroAddress } from 'viem'
import { same } from './format'
import { ticketAbi } from './ticketAbi'
import { ipfsUrl } from './ipfs'
import { TICKET_ADDRESS, DEPLOY_BLOCK } from './wagmi'

const base = { address: TICKET_ADDRESS, abi: ticketAbi }
const PAGE = 200n

// 행사·티켓은 컨트랙트의 배치 getter로 읽는다. (로그 전수 조회·티켓당 RPC 없음)
export async function loadEvents(client) {
  const count = await client.readContract({ ...base, functionName: 'eventCount' })
  const rows = []
  for (let from = 1n; from <= count; from += PAGE) {
    const list = await client.readContract({ ...base, functionName: 'viewEvents', args: [from, PAGE] })
    rows.push(...list)
  }
  // 이미지를 지정하지 않은 행사는 컨트랙트의 기본 이미지를 쓴다. (tokenURI와 같은 규칙)
  const defaultImage = await client.readContract({ ...base, functionName: 'defaultImageIpfs' })
  return rows.map((e) => ({
    id: Number(e.eventId),
    title: e.title,
    registrant: e.registrant,
    imageIpfs: e.imageIpfs,
    image: ipfsUrl(e.imageIpfs || defaultImage),
    progress: Number(e.progressInfo),
    maxMinted: Number(e.maxMintedTicketAmount),
    minted: Number(e.mintedTicketAmount),
    maxOwnable: Number(e.maxOwnableTicketAmount),
    reserved: e.reserved,
  }))
}

export async function loadTickets(client) {
  const count = await client.readContract({ ...base, functionName: 'ticketCount' })
  const rows = []
  for (let from = 0n; from < count; from += PAGE) {
    const [owners, infos] = await client.readContract({ ...base, functionName: 'viewTickets', args: [from, PAGE] })
    owners.forEach((owner, i) => {
      if (owner === zeroAddress) return // 소각된 티켓
      const t = infos[i]
      rows.push({
        id: from + BigInt(i),
        owner,
        eventId: Number(t.eventId),
        price: t.price,
        reservationPrice: t.reservationPrice,
        onSale: t.isOnSale,
        traded: t.isTraded,
        used: t.isUsed,
      })
    })
  }
  return rows
}

// 관리자 승인 대기 목록: SellerRequested 로그의 주소 중 아직 신청 상태인 주소
export async function loadSellerRequests(client) {
  const logs = await client.getContractEvents({ ...base, eventName: 'SellerRequested', fromBlock: DEPLOY_BLOCK })
  const users = [...new Set(logs.map((l) => l.args.user))]
  const states = await Promise.all(
    users.map((u) => client.readContract({ ...base, functionName: 'sellerStatus', args: [u] })),
  )
  return users.filter((_, i) => states[i][1])
}

// 내 최근 거래: 예매·양도 구매·환불은 내가 buyer 인 이벤트, 양도 판매는 내가 보낸 Transfer 와 같은 트랜잭션의 TicketResold 로 찾는다.
export async function loadActivity(client, address) {
  const fromBlock = DEPLOY_BLOCK
  const [reserved, resold, refunded, sent] = await Promise.all([
    client.getContractEvents({ ...base, eventName: 'TicketReserved', args: { buyer: address }, fromBlock }),
    client.getContractEvents({ ...base, eventName: 'TicketResold', fromBlock }),
    client.getContractEvents({ ...base, eventName: 'TicketRefunded', args: { buyer: address }, fromBlock }),
    client.getContractEvents({ ...base, eventName: 'Transfer', args: { from: address }, fromBlock }),
  ])
  const rows = []
  reserved.forEach((l) => rows.push({ kind: 'reserve', ticketId: l.args.ticketId, amount: l.args.price, block: l.blockNumber, key: `${l.transactionHash}-r` }))
  refunded.forEach((l) => rows.push({ kind: 'refund', ticketId: l.args.ticketId, amount: l.args.amount, block: l.blockNumber, key: `${l.transactionHash}-f` }))
  resold.filter((l) => same(l.args.buyer, address)).forEach((l) => rows.push({ kind: 'buy', ticketId: l.args.ticketId, amount: l.args.price, block: l.blockNumber, key: `${l.transactionHash}-b` }))
  const byTx = new Map(resold.map((l) => [l.transactionHash, l]))
  sent.forEach((t) => {
    const r = byTx.get(t.transactionHash)
    if (r && !same(r.args.buyer, address)) {
      rows.push({ kind: 'sell', ticketId: r.args.ticketId, amount: r.args.price, block: t.blockNumber, counterparty: r.args.buyer, key: `${t.transactionHash}-s` })
    }
  })
  rows.sort((a, b) => (a.block === b.block ? 0 : a.block < b.block ? 1 : -1))
  const top = rows.slice(0, 10)
  const stamps = new Map()
  await Promise.all([...new Set(top.map((r) => r.block))].map(async (b) => {
    const blk = await client.getBlock({ blockNumber: b })
    stamps.set(b, Number(blk.timestamp) * 1000)
  }))
  return top.map((r) => ({ ...r, time: stamps.get(r.block) }))
}
