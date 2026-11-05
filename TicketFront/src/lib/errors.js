import { MAX_EVENT_TICKETS, MAX_MINT_BATCH } from './limits'

// 컨트랙트 커스텀 에러 이름 → 사용자 문구
const CONTRACT_ERRORS = {
  NotAdmin: '관리자 권한이 필요합니다.',
  NotSeller: '주최자 권한이 필요합니다.',
  NotRegistrant: '이 행사의 주최자만 할 수 있습니다.',
  EventNotFound: '해당 제목의 행사가 없습니다.',
  EventExists: '같은 제목의 행사가 이미 있습니다.',
  InvalidAmount: '수량이 올바르지 않습니다. 행사당 최대 ' + MAX_EVENT_TICKETS + '장, 한 번에 최대 ' + MAX_MINT_BATCH + '장까지 발행할 수 있습니다.',
  InvalidPrice: '가격이 올바르지 않습니다.',
  BadState: '현재 행사 상태에서는 할 수 없는 동작입니다.',
  MintLimit: '최대 발행량을 넘어 발행할 수 없습니다.',
  TransferDisabled: '티켓은 직접 전송할 수 없습니다. 티켓 2차 거래를 이용해주세요.',
  ApprovalDisabled: '티켓 승인 기능은 사용할 수 없습니다.',
  AlreadySeller: '이미 주최자입니다.',
  NotASeller: '주최자가 아닌 주소입니다.',
  RequestExists: '이미 신청이 접수되어 있습니다. 관리자 승인을 기다려주세요.',
  NoRequest: '해당 주소의 신청이 없습니다.',
  SellerCannotBuy: '주최자 계정으로는 티켓을 구매할 수 없습니다.',
  NotReserving: '예매 기간이 아닙니다.',
  NoSuchTicket: '존재하지 않는 티켓입니다.',
  NotForSale: '판매 중인 티켓이 아닙니다. 이미 다른 사람이 구매했을 수 있습니다.',
  NotOnSale: '판매 중인 티켓이 아닙니다.',
  WrongPrice: '티켓 가격과 결제 금액이 맞지 않습니다.',
  OwnLimit: '이 공연에서 지갑당 보유할 수 있는 티켓 수에 도달했습니다.',
  NotPrimaryTicket: '예매할 수 없는 티켓입니다.',
  NotTicketOwner: '내가 보유한 티켓이 아닙니다.',
  TicketTraded: '양도받은 티켓은 환불할 수 없습니다.',
  TicketOnSale: '판매 중인 티켓은 먼저 판매를 중단해야 합니다.',
  TicketUsed: '이미 사용된 티켓은 판매할 수 없습니다.',
  AlreadyUsed: '이미 입장 처리된 티켓입니다.',
  PriceTooHigh: '최초 예매가를 넘는 가격으로는 양도할 수 없습니다.',
  NothingToWithdraw: '출금할 수 있는 금액이 없습니다. 공연 시작 전 예매금은 환불 재원으로 보관됩니다.',
  ERC721NonexistentToken: '존재하지 않거나 이미 소각된 티켓입니다. 화면을 새로고침해 최신 상태를 확인해주세요.',
  ERC721IncorrectOwner: '내가 보유한 티켓이 아닙니다.',
  ERC721InvalidReceiver: '티켓을 받을 수 없는 지갑입니다. 일반 지갑 주소(EOA)를 사용해주세요.',
  ERC721InvalidSender: '티켓을 보낼 수 없는 상태입니다.',
  ERC721InvalidOwner: '올바르지 않은 소유자 주소입니다.',
  ERC721InsufficientApproval: '이 티켓은 승인 기능을 사용할 수 없습니다.',
  ERC721InvalidApprover: '이 티켓은 승인 기능을 사용할 수 없습니다.',
  ERC721InvalidOperator: '이 티켓은 승인 기능을 사용할 수 없습니다.',
  NotCancled: '취소된 행사에서만 환불을 청구할 수 있습니다.',
  TransferFailed: '송금에 실패했습니다. 받는 지갑이 입금을 거부했을 수 있습니다.',
}

// 지갑·컨트랙트 에러를 사용자가 이해할 수 있는 문장으로 바꾼다.
export function friendlyError(e) {
  const msg = e?.shortMessage || e?.message || '알 수 없는 오류가 발생했습니다.'
  if (e?.code === 4001 || /user rejected|user denied|rejected the request/i.test(msg)) {
    return '지갑에서 요청을 취소했습니다.'
  }
  if (/insufficient funds/i.test(msg)) return '잔액이 부족합니다. 결제 금액과 가스비를 확인해주세요.'
  if (/nonce/i.test(msg)) return '이전 요청이 아직 처리 중입니다. 잠시 후 다시 시도해주세요.'
  if (/invalid parameters|internal error/i.test(msg)) return '요청을 처리하지 못했습니다. 지갑 연결과 네트워크를 확인한 뒤 다시 시도해주세요.'
  const name = e?.walk?.((x) => x?.data?.errorName)?.data?.errorName
  if (name && CONTRACT_ERRORS[name]) return CONTRACT_ERRORS[name]
  const reason = e?.walk?.((x) => x?.reason)?.reason
  if (reason) return reason
  return msg.split('\n')[0]
}
