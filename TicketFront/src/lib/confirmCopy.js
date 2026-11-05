import { formatEth } from './format'

// 확인창 문구 한 곳. 항상 "대상(번호·공연명)"과 "결과"를 함께 알려 준다.
const name = (t, e) => `티켓 #${t.id} · ${e?.title ?? `행사 #${t.eventId}`}`

export const confirmReserve = (ask, t, e) =>
  ask(`${name(t, e)}\n결제 금액 ${formatEth(t.price)} ETH. 예매 기간에는 환불할 수 있고, 네트워크 수수료(가스비)가 별도로 청구됩니다.`,
    { title: '이 티켓을 예매할까요?', confirmLabel: '예매하기' })

export const confirmResale = (ask, t, e) =>
  ask(`${name(t, e)}\n구매 금액 ${formatEth(t.price)} ETH (최초 예매가 ${formatEth(t.reservationPrice)} ETH). 양도받은 티켓은 환불되지 않으며 되돌릴 수 없습니다. 네트워크 수수료(가스비)가 별도로 청구됩니다.`,
    { title: '양도 티켓을 구매할까요?', confirmLabel: '구매하기' })

export const confirmRefund = (ask, t, e) =>
  ask(`${name(t, e)}\n환불 금액 ${formatEth(t.reservationPrice)} ETH가 지갑으로 돌아옵니다. 이 티켓은 내 지갑에서 사라지고 다시 판매 대상이 됩니다. 예매 기간에만 가능하며, 네트워크 수수료(가스비)는 환불되지 않습니다.`,
    { title: '티켓을 환불할까요?', confirmLabel: '환불하기', danger: true })

export const confirmUse = (ask, t, e) =>
  ask(`${name(t, e)}\n입장 처리하면 이 티켓은 사용 완료되며, 이후 양도·환불할 수 없습니다.`,
    { title: '입장 처리할까요?', confirmLabel: '입장하기' })

export const confirmClaim = (ask, t, e) =>
  ask(`${name(t, e)}\n취소된 공연입니다. 예매금 ${formatEth(t.reservationPrice)} ETH를 환불받고 이 티켓은 사라집니다. 네트워크 수수료(가스비)는 환불되지 않습니다.`,
    { title: '환불을 받을까요?', confirmLabel: '환불 받기' })
