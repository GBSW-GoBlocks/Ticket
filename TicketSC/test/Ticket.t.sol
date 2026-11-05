//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Ticket} from "../src/Ticket.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract TicketTest is Test {
    Ticket ticket;

    address owner = makeAddr("owner");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address buyer2 = makeAddr("buyer2");

    string constant EVENT_TITLE = "Concert";

    uint256 constant MAX_TICKETS = 10;
    uint256 constant MAX_OWNABLE = 2;
    uint256 constant RESERVATION_PRICE = 1 ether;

    function setUp() public {
        vm.prank(owner);
        ticket = new Ticket();

        // seller가 판매자 등록 요청
        vm.prank(seller);
        ticket.requestSeller();

        // owner가 seller 승인
        vm.prank(owner);
        ticket.approveSellerRequest(seller);

        // seller가 행사 생성
        vm.prank(seller);
        ticket.addEvent(
            EVENT_TITLE,
            MAX_TICKETS,
            MAX_OWNABLE,
            ""
        );

        // seller가 티켓 3장 발행
        vm.prank(seller);
        ticket.mintTicket(
            EVENT_TITLE,
            3,
            RESERVATION_PRICE
        );

        // 구매자에게 ETH 공급
        vm.deal(buyer, 100 ether);
        vm.deal(buyer2, 100 ether);
        vm.deal(seller, 100 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            AUTHORITY
    //////////////////////////////////////////////////////////////*/

    function test_ownerAuth() public {
        vm.prank(owner);

        assertEq(
            ticket.checkMyAuth(),
            "owner"
        );
    }

    function test_sellerAuth() public {
        vm.prank(seller);

        assertEq(
            ticket.checkMyAuth(),
            "seller"
        );
    }

    function test_buyerAuth() public {
        vm.prank(buyer);

        assertEq(
            ticket.checkMyAuth(),
            "user"
        );
    }

    function test_sellerRequest() public {
        address newSeller = makeAddr("newSeller");

        vm.prank(newSeller);
        ticket.requestSeller();

        vm.prank(owner);
        ticket.approveSellerRequest(newSeller);

        vm.prank(newSeller);

        assertEq(
            ticket.checkMyAuth(),
            "seller"
        );
    }

    function test_onlyOwnerCanApproveSeller() public {
        address newSeller = makeAddr("newSeller");

        vm.prank(newSeller);
        ticket.requestSeller();

        vm.prank(newSeller);

        vm.expectRevert(
            Ticket.NotAdmin.selector
        );

        ticket.approveSellerRequest(newSeller);
    }

    function test_stripSeller() public {
        vm.prank(owner);
        ticket.stripSeller(seller);

        vm.prank(seller);

        assertEq(
            ticket.checkMyAuth(),
            "user"
        );
    }

    /*//////////////////////////////////////////////////////////////
                              EVENT
    //////////////////////////////////////////////////////////////*/

    function test_eventCreated() public {
        assertEq(
            uint256(ticket.viewEventInfoById(1)),
            1
        );
    }

    function test_onlySellerCanAddEvent() public {
        vm.prank(buyer);

        vm.expectRevert(
            Ticket.NotSeller.selector
        );

        ticket.addEvent(
            "Another Concert",
            10,
            2,
            ""
        );
    }

    function test_cannotCreateDuplicateEvent() public {
        vm.prank(seller);

        vm.expectRevert(
            Ticket.EventExists.selector
        );

        ticket.addEvent(
            EVENT_TITLE,
            10,
            2,
            ""
        );
    }

    /*//////////////////////////////////////////////////////////////
                               MINT
    //////////////////////////////////////////////////////////////*/

    function test_mintTicket() public {
        assertEq(
            ticket.viewTicketOwner(0),
            seller
        );

        assertEq(
            ticket.viewTicketOwner(1),
            seller
        );

        assertEq(
            ticket.viewTicketOwner(2),
            seller
        );
    }

    function test_mintTicket_maxAmount() public {
        vm.prank(seller);

        vm.expectRevert(
            Ticket.MintLimit.selector
        );

        ticket.mintTicket(
            EVENT_TITLE,
            MAX_TICKETS + 1,
            RESERVATION_PRICE
        );
    }

    function test_mintTicket_cannotMintAfterReservationStarts() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(seller);

        vm.expectRevert(
            Ticket.BadState.selector
        );

        ticket.mintTicket(
            EVENT_TITLE,
            1,
            RESERVATION_PRICE
        );
    }

    /*//////////////////////////////////////////////////////////////
                          RESERVATION
    //////////////////////////////////////////////////////////////*/

    function test_startReservation() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        assertEq(
            uint256(ticket.viewEventInfoById(1)),
            0
        );
    }

    function test_onlyRegistrantCanStartReservation() public {
        vm.prank(buyer);

        vm.expectRevert(
            Ticket.NotRegistrant.selector
        );

        ticket.startReservation(EVENT_TITLE);
    }

    function test_reserveTicket() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        assertEq(
            ticket.viewTicketOwner(0),
            buyer
        );
    }

    function test_reserveTicket_holdsProceedsInEscrow() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(0);

        // 예매금은 공연 시작 전까지 환불 재원으로 묶여 있어 출금할 수 없다.
        assertEq(ticket.withdrawableBalance(seller), 0);
        assertEq(ticket.eventEscrow(1), RESERVATION_PRICE);
        assertEq(address(ticket).balance, RESERVATION_PRICE);
    }

    function test_reserveTicket_wrongPrice(uint256 price) public {
        vm.assume(price != RESERVATION_PRICE);
        vm.assume(price <= 10 ether);

        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.WrongPrice.selector
        );

        ticket.reserveTicket{
            value: price
        }(0);
    }

    function test_reserveTicket_sellerCannotBuy() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(seller);

        vm.expectRevert(
            Ticket.SellerCannotBuy.selector
        );

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);
    }

    function test_reserveTicket_cannotReserveTwice() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.NotForSale.selector
        );

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);
    }

    /*//////////////////////////////////////////////////////////////
                      RESERVATION FINISH
    //////////////////////////////////////////////////////////////*/

    function test_finishReservation() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        assertEq(
            uint256(ticket.viewEventInfoById(1)),
            1
        );
    }

    function test_finishReservation_withoutReserving_reverts() public {
        vm.prank(seller);

        vm.expectRevert(
            Ticket.BadState.selector
        );

        ticket.finishReservation(EVENT_TITLE);
    }

    /*//////////////////////////////////////////////////////////////
                              REFUND
    //////////////////////////////////////////////////////////////*/

    function test_refundTicket() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        uint256 beforeBalance = buyer.balance;

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        assertEq(
            ticket.viewTicketOwner(0),
            buyer
        );

        vm.prank(buyer);
        ticket.refundTicket(0);

        assertEq(
            ticket.viewTicketOwner(0),
            seller
        );

        assertEq(
            buyer.balance,
            beforeBalance
        );
        assertEq(ticket.withdrawableBalance(seller), 0);
        assertEq(address(ticket).balance, 0);
    }

    function test_refundTicket_afterReservationEnds_reverts() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.NotReserving.selector
        );

        ticket.refundTicket(0);
    }

    function test_refundTicket_notOwner_reverts() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(buyer2);

        vm.expectRevert(
            Ticket.NotTicketOwner.selector
        );

        ticket.refundTicket(0);
    }

    /*//////////////////////////////////////////////////////////////
                         SECONDARY SALE
    //////////////////////////////////////////////////////////////*/

    function test_ticketOnSale() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.ticketOnSale(
            0,
            0.8 ether
        );

        assertTrue(ticket.ticketDetail(0).isOnSale);
    }

    function test_ticketOnSale_cannotExceedReservationPrice() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.PriceTooHigh.selector
        );

        ticket.ticketOnSale(
            0,
            1.1 ether
        );
    }

    function test_ticketOnSale_onlyOwner() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(buyer2);

        vm.expectRevert(
            Ticket.NotTicketOwner.selector
        );

        ticket.ticketOnSale(
            0,
            0.8 ether
        );
    }

    /*//////////////////////////////////////////////////////////////
                     SECONDARY PURCHASE
    //////////////////////////////////////////////////////////////*/

    function test_buyTicket() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.ticketOnSale(
            0,
            0.8 ether
        );

        uint256 sellerBalanceBefore = buyer.balance;
        uint256 contractBalanceBefore = address(ticket).balance;

        vm.prank(buyer2);

        ticket.buyTicket{
            value: 0.8 ether
        }(0);

        assertEq(ticket.viewTicketOwner(0), buyer2);
        assertEq(buyer.balance, sellerBalanceBefore);
        assertEq(ticket.withdrawableBalance(buyer), 0.8 ether);
        assertEq(address(ticket).balance, contractBalanceBefore + 0.8 ether);
    }

    function test_withdrawProceeds_paysAccruedBalance() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(0);

        vm.startPrank(seller);
        ticket.finishReservation(EVENT_TITLE);
        ticket.startEvent(EVENT_TITLE);
        vm.stopPrank();

        uint256 sellerBalanceBefore = seller.balance;
        vm.prank(seller);
        ticket.withdrawProceeds();

        assertEq(seller.balance, sellerBalanceBefore + RESERVATION_PRICE);
        assertEq(ticket.withdrawableBalance(seller), 0);
        assertEq(address(ticket).balance, 0);
    }

    function test_withdrawProceeds_paysResellerAfterSecondarySale() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);
        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(0);
        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);
        vm.prank(buyer);
        ticket.ticketOnSale(0, 0.8 ether);
        vm.prank(buyer2);
        ticket.buyTicket{value: 0.8 ether}(0);

        uint256 buyerBalanceBefore = buyer.balance;
        vm.prank(buyer);
        ticket.withdrawProceeds();

        assertEq(buyer.balance, buyerBalanceBefore + 0.8 ether);
        assertEq(ticket.withdrawableBalance(buyer), 0);
        // 1 ETH primary proceeds remain owed to the event registrant.
        assertEq(address(ticket).balance, RESERVATION_PRICE);
    }

    function test_withdrawProceeds_withoutBalance_reverts() public {
        vm.prank(buyer);
        vm.expectRevert(Ticket.NothingToWithdraw.selector);
        ticket.withdrawProceeds();
    }

    /*//////////////////////////////////////////////////////////////
                           USE TICKET
    //////////////////////////////////////////////////////////////*/

    function test_useTicket() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(seller);
        ticket.startEvent(EVENT_TITLE);

        vm.prank(buyer);

        ticket.useTicket(0);
    }

    function test_useTicket_beforeEventStarts_reverts() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.BadState.selector
        );

        ticket.useTicket(0);
    }

    function test_useTicket_twice_reverts() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(seller);
        ticket.startEvent(EVENT_TITLE);

        vm.prank(buyer);

        ticket.useTicket(0);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.AlreadyUsed.selector
        );

        ticket.useTicket(0);
    }

    /*//////////////////////////////////////////////////////////////
                           START EVENT
    //////////////////////////////////////////////////////////////*/

    function test_startEvent() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(seller);
        ticket.startEvent(EVENT_TITLE);

        assertEq(
            uint256(ticket.viewEventInfoById(1)),
            2
        );
    }

    function test_startEvent_beforeReservationFinished_reverts() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(seller);

        vm.expectRevert(
            Ticket.BadState.selector
        );

        ticket.startEvent(EVENT_TITLE);
    }

    /*//////////////////////////////////////////////////////////////
                           FINISH EVENT
    //////////////////////////////////////////////////////////////*/

    function test_finishEvent() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(seller);
        ticket.startEvent(EVENT_TITLE);

        vm.prank(seller);
        ticket.finishEvent(EVENT_TITLE);

        assertEq(
            uint256(ticket.viewEventInfoById(1)),
            3
        );
    }

    /*//////////////////////////////////////////////////////////////
                         EVENT CANCELLATION
    //////////////////////////////////////////////////////////////*/

    function test_cancelEvent_beforeReservation() public {
        vm.prank(seller);

        ticket.cancleEvent(EVENT_TITLE);

        assertEq(
            uint256(ticket.viewEventInfoById(1)),
            4
        );
    }

    function test_cancelEvent_afterReservation_refundsBuyer() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        uint256 beforeBalance = buyer.balance;

        vm.prank(seller);
        ticket.cancleEvent(EVENT_TITLE);

        // 취소만으로는 환불되지 않고, 예매자가 직접 청구해야 한다.
        assertEq(buyer.balance, beforeBalance);
        assertEq(ticket.eventEscrow(1), RESERVATION_PRICE);

        vm.prank(buyer);
        ticket.claimRefund(0);

        assertEq(
            buyer.balance,
            beforeBalance + RESERVATION_PRICE
        );
        assertEq(ticket.withdrawableBalance(seller), 0);
        assertEq(address(ticket).balance, 0);
    }

    /*//////////////////////////////////////////////////////////////
                       DIRECT TRANSFER BLOCK
    //////////////////////////////////////////////////////////////*/

    function test_directTransferIsBlocked() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.TransferDisabled.selector
        );

        ticket.transferFrom(
            buyer,
            buyer2,
            0
        );
    }

    function test_approveIsBlocked() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);

        ticket.reserveTicket{
            value: RESERVATION_PRICE
        }(0);

        vm.prank(buyer);

        vm.expectRevert(
            Ticket.ApprovalDisabled.selector
        );

        ticket.approve(
            buyer2,
            0
        );
    }

    /*//////////////////////////////////////////////////////////////
                    REGRESSION: 안건 20, 21 (배심원 토론)
    //////////////////////////////////////////////////////////////*/

    function _reserveAndClose() internal {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(0);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);
    }

    function test_withdraw_duringReservation_cannotBreakRefund() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(0);

        // 예매 기간에는 출금할 잔액이 없다.
        vm.prank(seller);
        vm.expectRevert(Ticket.NothingToWithdraw.selector);
        ticket.withdrawProceeds();

        // 따라서 환불은 항상 가능하다.
        uint256 before = buyer.balance;
        vm.prank(buyer);
        ticket.refundTicket(0);

        assertEq(buyer.balance, before + RESERVATION_PRICE);
        assertEq(ticket.eventEscrow(1), 0);
    }

    function test_cancelEvent_withTicketOnSale_refundsAndReleases() public {
        _reserveAndClose();

        // 구매자가 양도 등록해 둔 상태에서도 주최자가 취소할 수 있어야 한다.
        vm.prank(buyer);
        ticket.ticketOnSale(0, RESERVATION_PRICE);

        uint256 before = buyer.balance;
        vm.prank(seller);
        ticket.cancleEvent(EVENT_TITLE);

        vm.prank(buyer);
        ticket.claimRefund(0);

        assertEq(buyer.balance, before + RESERVATION_PRICE);
        assertEq(ticket.eventEscrow(1), 0);
        assertEq(address(ticket).balance, 0);
        assertFalse(ticket.ticketDetail(0).isOnSale);
    }

    function test_finishEvent_withTicketOnSale_works() public {
        _reserveAndClose();

        vm.prank(buyer);
        ticket.ticketOnSale(0, RESERVATION_PRICE);

        vm.startPrank(seller);
        ticket.startEvent(EVENT_TITLE);
        ticket.finishEvent(EVENT_TITLE);
        vm.stopPrank();

        // 종료 후에는 판매 표시가 남아 있어도 구매할 수 없다.
        vm.prank(buyer2);
        vm.expectRevert(Ticket.BadState.selector);
        ticket.buyTicket{value: RESERVATION_PRICE}(0);
    }

    function test_cancelEvent_afterResale_keepsPrimaryProceedsForSeller() public {
        _reserveAndClose();

        vm.prank(buyer);
        ticket.ticketOnSale(0, RESERVATION_PRICE);

        vm.prank(buyer2);
        ticket.buyTicket{value: RESERVATION_PRICE}(0);

        // 첫 양도 시점에 최초 예매금이 주최자 정산 잔액으로 옮겨지고, 양도된 티켓은 환불되지 않는다.
        assertEq(ticket.eventEscrow(1), 0);
        assertEq(ticket.withdrawableBalance(seller), RESERVATION_PRICE);

        vm.prank(seller);
        ticket.cancleEvent(EVENT_TITLE);

        vm.prank(buyer2);
        vm.expectRevert(Ticket.TicketTraded.selector);
        ticket.claimRefund(0);

        assertEq(ticket.eventEscrow(1), 0);
        assertEq(ticket.withdrawableBalance(seller), RESERVATION_PRICE);
        assertEq(ticket.withdrawableBalance(buyer), RESERVATION_PRICE);
    }

    function test_getters_exposeStateWithoutKoreanStrings() public {
        _reserveAndClose();

        Ticket.EventInfo memory info = ticket.viewEvent(1);
        assertEq(info.title, EVENT_TITLE);
        assertTrue(info.reserved);
        assertEq(info.mintedTicketAmount, 3);
        assertEq(ticket.eventCount(), 1);
        assertEq(ticket.ownTicketCount(1, buyer), 1);
        (bool isSellerNow, ) = ticket.sellerStatus(seller);
        assertTrue(isSellerNow);
    }

    function test_batchGetters_returnTicketsAndEvents() public {
        _reserveAndClose();

        // 예매 마감으로 미판매 티켓(1, 2번)은 소각된다.
        assertEq(ticket.ticketCount(), 3);
        (address[] memory owners, Ticket.TicketInfo[] memory infos) = ticket.viewTickets(0, 10);
        assertEq(owners.length, 3);
        assertEq(owners[0], buyer);
        assertEq(owners[1], address(0));
        assertEq(infos[0].eventId, 1);
        assertEq(infos[1].eventId, 0);

        (address[] memory page, ) = ticket.viewTickets(2, 5);
        assertEq(page.length, 1);

        Ticket.EventInfo[] memory list = ticket.viewEvents(1, 10);
        assertEq(list.length, 1);
        assertEq(list[0].title, EVENT_TITLE);
        assertEq(ticket.viewEvents(5, 3).length, 0);
    }

    /*//////////////////////////////////////////////////////////////
                    REGRESSION: 안건 24 (루프·pull 환불·상한)
    //////////////////////////////////////////////////////////////*/

    // 환불받는 컨트랙트 지갑이 입금을 거부해도 행사 취소는 막히지 않는다.
    function test_cancelEvent_cannotBeBlockedByRejectingBuyer() public {
        RejectingBuyer bad = new RejectingBuyer();
        vm.deal(address(bad), 10 ether);

        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        bad.reserve(ticket, 0, RESERVATION_PRICE);

        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(1);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(seller);
        ticket.cancleEvent(EVENT_TITLE);

        // 거부하는 지갑의 환불만 실패하고, 다른 예매자는 정상적으로 환불받는다.
        vm.expectRevert(Ticket.TransferFailed.selector);
        bad.claim(ticket, 0);

        uint256 before = buyer.balance;
        vm.prank(buyer);
        ticket.claimRefund(1);
        assertEq(buyer.balance, before + RESERVATION_PRICE);
    }

    function test_claimRefund_requiresCancled() public {
        _reserveAndClose();

        vm.prank(buyer);
        vm.expectRevert(Ticket.NotCancled.selector);
        ticket.claimRefund(0);
    }

    function test_claimRefund_onlyOwner_andOnlyOnce() public {
        _reserveAndClose();

        vm.prank(seller);
        ticket.cancleEvent(EVENT_TITLE);

        vm.prank(buyer2);
        vm.expectRevert(Ticket.NotTicketOwner.selector);
        ticket.claimRefund(0);

        vm.prank(buyer);
        ticket.claimRefund(0);

        // 소각된 티켓은 다시 청구할 수 없다.
        vm.prank(buyer);
        vm.expectRevert();
        ticket.claimRefund(0);
    }

    function test_limits_eventSizeAndMintBatch() public {
        vm.startPrank(seller);

        vm.expectRevert(Ticket.InvalidAmount.selector);
        ticket.addEvent("Too Big", 301, 2, "");

        ticket.addEvent("Big", 300, 2, "");

        vm.expectRevert(Ticket.InvalidAmount.selector);
        ticket.mintTicket("Big", 101, RESERVATION_PRICE);

        ticket.mintTicket("Big", 100, RESERVATION_PRICE);

        vm.stopPrank();
    }

    function test_listing_removeFromMiddleKeepsIndexConsistent() public {
        vm.prank(seller);
        ticket.startReservation(EVENT_TITLE);

        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(0);
        vm.prank(buyer);
        ticket.reserveTicket{value: RESERVATION_PRICE}(1);
        vm.prank(buyer2);
        ticket.reserveTicket{value: RESERVATION_PRICE}(2);

        vm.prank(seller);
        ticket.finishReservation(EVENT_TITLE);

        vm.prank(buyer);
        ticket.ticketOnSale(0, RESERVATION_PRICE);
        vm.prank(buyer);
        ticket.ticketOnSale(1, RESERVATION_PRICE);
        vm.prank(buyer2);
        ticket.ticketOnSale(2, RESERVATION_PRICE);

        // 가운데(0번) 판매를 중단하면 마지막(2번)이 그 자리로 이동한다.
        vm.prank(buyer);
        ticket.ticketDownSale(0);

        uint256[] memory list = ticket.viewTicketsOnSale();
        assertEq(list.length, 2);
        assertEq(list[0], 2);
        assertEq(list[1], 1);

        // 이동한 항목도 정상적으로 내릴 수 있다.
        vm.prank(buyer2);
        ticket.ticketDownSale(2);
        assertEq(ticket.viewTicketsOnSale().length, 1);
        assertEq(ticket.viewTicketsOnSale()[0], 1);
    }

    function test_finishReservation_burnsOnlyThisEventsUnsold() public {
        vm.prank(seller);
        ticket.addEvent("Other", 5, 2, "");
        vm.prank(seller);
        ticket.mintTicket("Other", 2, RESERVATION_PRICE);

        _reserveAndClose();

        // Concert 의 미판매(1,2번)만 소각되고 Other 의 티켓(3,4번)은 남는다.
        assertEq(ticket.viewTicketOwner(3), seller);
        assertEq(ticket.viewTicketOwner(4), seller);
        (address[] memory owners, ) = ticket.viewTickets(0, 5);
        assertEq(owners[1], address(0));
        assertEq(owners[2], address(0));
    }
    // 최대 크기(300장) 행사의 예매 마감(미판매 전량 소각)이 블록 가스 한도(30M) 안에 든다.
    function test_gas_finishReservation_atMaxEventSize() public {
        vm.startPrank(seller);
        ticket.addEvent("Max", 300, 4, "");
        ticket.mintTicket("Max", 100, RESERVATION_PRICE);
        ticket.mintTicket("Max", 100, RESERVATION_PRICE);
        ticket.mintTicket("Max", 100, RESERVATION_PRICE);
        ticket.startReservation("Max");

        uint256 g = gasleft();
        ticket.finishReservation("Max");
        uint256 used = g - gasleft();
        vm.stopPrank();

        emit log_named_uint("finishReservation gas (300 tickets)", used);
        assertLt(used, 30_000_000);
    }

    /*//////////////////////////////////////////////////////////////
                            TOKEN URI / IMAGE
    //////////////////////////////////////////////////////////////*/

    function _expectedURI(uint256 id, string memory image) internal pure returns (string memory) {
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(abi.encodePacked('{"name":"Ticket #', Strings.toString(id), '","image":"ipfs://', image, '"}'))
        );
    }

    function test_tokenURI_usesDefaultImage_whenEventHasNoImage() public view {
        assertEq(ticket.tokenURI(0), _expectedURI(0, ticket.defaultImageIpfs()));
    }

    function test_tokenURI_usesEventImage() public {
        vm.startPrank(seller);
        ticket.addEvent("Art", 5, 2, "bafcustom");
        ticket.mintTicket("Art", 1, RESERVATION_PRICE);
        vm.stopPrank();

        // setUp에서 3장(0~2)을 발행했으므로 새 티켓은 3번이다.
        assertEq(ticket.tokenURI(3), _expectedURI(3, "bafcustom"));
        assertEq(ticket.tokenURI(0), _expectedURI(0, ticket.defaultImageIpfs()));
    }

    function test_setEventImage_changesTokenURI() public {
        vm.prank(seller);
        ticket.setEventImage("bafchanged", EVENT_TITLE);

        assertEq(ticket.tokenURI(0), _expectedURI(0, "bafchanged"));
        assertEq(ticket.tokenURI(2), _expectedURI(2, "bafchanged"));
    }

    function test_setEventImage_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit Ticket.eventImageChanged(EVENT_TITLE, "bafchanged");

        vm.prank(seller);
        ticket.setEventImage("bafchanged", EVENT_TITLE);
    }

    function test_setEventImage_byOtherUser_reverts() public {
        vm.prank(buyer);
        vm.expectRevert(Ticket.NotRegistrant.selector);
        ticket.setEventImage("bafhack", EVENT_TITLE);
    }

    function test_setEventImage_otherSeller_reverts() public {
        address seller2 = makeAddr("seller2");

        vm.prank(seller2);
        ticket.requestSeller();
        vm.prank(owner);
        ticket.approveSellerRequest(seller2);

        vm.prank(seller2);
        vm.expectRevert(Ticket.NotRegistrant.selector);
        ticket.setEventImage("bafhack", EVENT_TITLE);
    }

    function test_setEventImage_unknownEvent_reverts() public {
        vm.prank(seller);
        vm.expectRevert(Ticket.EventNotFound.selector);
        ticket.setEventImage("bafx", "No Such Event");
    }

    function test_setDefaultEventImage_onlyOwner() public {
        vm.prank(seller);
        vm.expectRevert(Ticket.NotAdmin.selector);
        ticket.setDefaultEventImage("bafhack");

        vm.expectEmit(false, false, false, true);
        emit Ticket.defaultImageChanged("bafnewdefault");

        vm.prank(owner);
        ticket.setDefaultEventImage("bafnewdefault");

        assertEq(ticket.defaultImageIpfs(), "bafnewdefault");
        // 이미지를 지정하지 않은 행사에는 바뀐 기본 이미지가 바로 반영된다.
        assertEq(ticket.tokenURI(0), _expectedURI(0, "bafnewdefault"));
    }

    function test_tokenURI_unknownToken_reverts() public {
        vm.expectRevert();
        ticket.tokenURI(999);
    }

    function test_tokenURI_burnedToken_reverts() public {
        _reserveAndClose();

        // 팔리지 않은 1번은 finishReservation에서 소각된다.
        vm.expectRevert();
        ticket.tokenURI(1);

        // 팔린 0번은 그대로 조회된다.
        assertEq(ticket.tokenURI(0), _expectedURI(0, ticket.defaultImageIpfs()));
    }

}

contract RejectingBuyer {
    function reserve(Ticket t, uint256 id, uint256 price) external {
        t.reserveTicket{value: price}(id);
    }

    function claim(Ticket t, uint256 id) external {
        t.claimRefund(id);
    }

    // 환불 입금을 거부한다.
    receive() external payable {
        revert();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
