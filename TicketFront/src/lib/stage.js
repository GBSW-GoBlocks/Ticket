// 컨트랙트 progress + reserved 조합으로 공연의 단계를 구한다.
export function stageOf(e) {
  if (e.progress === 0) return 'reserving'
  if (e.progress === 1) return e.reserved ? 'closed' : 'draft'
  if (e.progress === 2) return 'started'
  if (e.progress === 3) return 'finished'
  return 'cancled'
}

// 화면 전체에서 같은 말을 쓴다. (칩, 단계 표시, 필터, 버튼)
export const STAGE_LABEL = {
  draft: '준비중',
  reserving: '예매중',
  closed: '예매 마감',
  started: '공연중',
  finished: '종료',
  cancled: '취소',
}
export const STAGE_ORDER = ['reserving', 'closed', 'started', 'draft', 'finished', 'cancled']

// 동작별로 허용되는 단계
const ALLOWED = {
  mint: ['draft'],
  startReservation: ['draft'],
  finishReservation: ['reserving'],
  startEvent: ['closed'],
  finishEvent: ['started'],
  cancleEvent: ['draft', 'closed'],
}

// 막힌 이유 + 다음에 할 일을 알려 준다.
const WHY = {
  mint: { reserving: '예매가 시작된 공연은 티켓을 더 발행할 수 없습니다.', closed: '예매가 마감된 공연은 티켓을 더 발행할 수 없습니다.', started: '공연이 시작되어 티켓을 발행할 수 없습니다.', finished: '종료된 공연입니다.', cancled: '취소된 공연입니다.' },
  startReservation: { reserving: '이미 예매가 시작되었습니다.', closed: '예매가 이미 마감되었습니다.', started: '공연이 이미 시작되었습니다.', finished: '종료된 공연입니다.', cancled: '취소된 공연입니다.' },
  finishReservation: { draft: '먼저 예매를 시작하세요.', closed: '예매가 이미 마감되었습니다.', started: '공연이 이미 시작되었습니다.', finished: '종료된 공연입니다.', cancled: '취소된 공연입니다.' },
  startEvent: { draft: '먼저 예매를 시작하고 마감하세요.', reserving: '예매 중에는 공연을 시작할 수 없습니다. 먼저 예매를 마감하세요.', started: '공연이 이미 시작되었습니다.', finished: '종료된 공연입니다.', cancled: '취소된 공연입니다.' },
  finishEvent: { draft: '공연을 시작한 뒤 종료할 수 있습니다.', reserving: '공연을 시작한 뒤 종료할 수 있습니다.', closed: '공연을 시작한 뒤 종료할 수 있습니다.', finished: '이미 종료된 공연입니다.', cancled: '취소된 공연입니다.' },
  cancleEvent: { reserving: '예매 중에는 취소할 수 없습니다. 먼저 예매를 마감하세요.', started: '공연이 시작되어 취소할 수 없습니다.', finished: '종료된 공연은 취소할 수 없습니다.', cancled: '이미 취소된 공연입니다.' },
}

export function actionBlock(action, event) {
  const stage = stageOf(event)
  if (ALLOWED[action].includes(stage)) return ''
  return WHY[action]?.[stage] ?? `${STAGE_LABEL[stage]} 단계에서는 사용할 수 없습니다.`
}

// 지금 실제로 살 수 있는 판매 상태인가. 컨트랙트는 공연 시작·종료·취소 때 판매 표시를 일일이 내리지 않지만
// 모든 구매 경로가 행사 상태를 검사하므로, 화면에서는 행사 상태까지 함께 보고 판단한다.
export function isListed(ticket, event) {
  if (!ticket.onSale || !event) return false
  return event.progress === 0 || (event.progress === 1 && event.reserved)
}
