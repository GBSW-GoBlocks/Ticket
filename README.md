# Ticket

이더리움 기반 **NFT 공연 티켓 예매·재판매 스마트 컨트랙트** 프로젝트입니다.
티켓을 ERC-721 NFT로 발행하고, 예매·환불·재판매·입장 처리와 판매자 정산을 모두 온체인에서 처리합니다.

| 폴더 | 설명 |
| --- | --- |
| `TicketSC/` | 스마트 컨트랙트 (Foundry, Solidity ^0.8.34, OpenZeppelin ERC721) |
| `TicketFront/` | 웹 프론트엔드 (Vite) |

## 주요 개념

### 역할
- **관리자(owner)**: 컨트랙트 배포자. 판매자 신청을 승인하거나 판매자 권한을 회수합니다.
- **판매자(seller)**: 관리자가 승인한 주최자. 행사를 등록하고 티켓을 발행합니다. 판매자는 티켓을 구매할 수 없습니다.
- **일반 사용자(user)**: 티켓을 예매·재판매·구매하고 입장 처리를 합니다.

`requestSeller()` → 관리자 `approveSellerRequest()` 순서로 판매자가 됩니다. `checkMyAuth()`로 내 권한을 조회할 수 있습니다.

### 행사 진행 상태

```
BeforeStart ──startReservation──▶ Reserving ──finishReservation──▶ BeforeStart(예매 완료)
                                                                        │
                                          ┌─────────cancleEvent─────────┤
                                          ▼                             ▼ startEvent
                                      Cancled                        Started ──finishEvent──▶ Finished
```

1. `addEvent`로 행사를 등록합니다 (최대 티켓 수, 1인당 보유 가능 수 지정).
2. `mintTicket`으로 티켓을 발행합니다. 발행된 티켓은 주최자가 보유하며 판매 상태가 됩니다.
3. `startReservation`으로 예매를 엽니다. 사용자는 `reserveTicket`으로 정가를 내고 예매합니다.
4. `finishReservation`으로 예매를 마감합니다. 팔리지 않고 주최자에게 남은 티켓은 소각됩니다.
5. `startEvent`로 공연을 시작하고, 입장하는 사용자는 `useTicket`으로 티켓을 사용 처리합니다.
6. `finishEvent`로 행사를 종료합니다.

공연 시작 전에는 `cancleEvent`로 행사를 취소할 수 있습니다.

### 자금 흐름
- **예매금 에스크로**: 예매금은 행사별(`eventEscrow`)로 컨트랙트에 묶어 두며, 환불 재원으로 사용됩니다.
- **정산**: 공연이 시작(`startEvent`)되면 에스크로가 주최자의 출금 가능 잔액(`withdrawableBalance`)으로 풀립니다. 예매자가 첫 재판매를 하면 해당 티켓의 최초 예매금만 먼저 정산됩니다.
- **환불**
  - 예매 기간 중: `refundTicket`으로 전액 환불받고 티켓은 주최자에게 되돌아갑니다 (재판매된 티켓과 판매 중인 티켓은 제외).
  - 행사 취소 시: `claimRefund`로 최초 예매자가 직접 환불받습니다 (양도된 티켓은 제외). 환불을 받는 지갑이 거부해도 취소 자체는 막히지 않도록 pull 방식으로 설계했습니다.
- **출금**: 주최자와 재판매자는 `withdrawProceeds`로 잔액을 직접 출금합니다 (재판매 대금도 즉시 송금하지 않고 적립).

### 재판매
- 예매가 끝나고 공연 시작 전(`BeforeStart` + 예매 완료)에만 가능합니다.
- `ticketOnSale`로 판매 등록(가격은 **최초 예매가 이하**만 허용 — 암표 방지), `ticketDownSale`로 판매 취소, `buyTicket`으로 구매합니다.
- 판매 중인 티켓 목록은 `viewTicketsOnSale`로 조회합니다.

### 설계상 제약
- **일반 전송 차단**: `transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll`은 모두 revert됩니다. 티켓은 컨트랙트가 제공하는 예매·재판매 경로로만 이동합니다.
- **가스 한도 보호**: 행사당 티켓 최대 300장(`MAX_EVENT_TICKETS`), 1회 발행 최대 100장(`MAX_MINT_BATCH`)으로 제한해 상태 전환 반복문이 블록 가스 한도를 넘지 않게 합니다.
- 재판매 목록은 swap-and-pop으로 O(1) 제거합니다.
- 사용자 정의 에러(`NotSeller`, `WrongPrice`, `OwnLimit` 등)를 사용하며, 화면 문구는 프론트에서 에러 이름으로 매핑합니다.
- 조회용 함수로 페이지 단위 조회(`viewEvents`, `viewTickets`)를 제공합니다.

## 개발 (스마트 컨트랙트)

[Foundry](https://book.getfoundry.sh/)가 필요합니다. 서브모듈(forge-std, OpenZeppelin)을 함께 받아야 합니다.

```bash
git clone --recurse-submodules https://github.com/GBSW-GoBlocks/Ticket.git
cd Ticket/TicketSC
```

```bash
forge build
```

```bash
forge test
```

배포 스크립트는 `TicketSC/script/Ticket.s.sol`입니다. `TicketSC/.env.example`을 `.env`로 복사해 RPC URL과 Etherscan API 키를 채운 뒤 사용하세요. 개인키는 파일에 두지 말고 `cast wallet import`로 keystore를 쓰는 것을 권장합니다. 현재 Sepolia(11155111) 배포 기록이 `TicketSC/broadcast/`에 있습니다.
