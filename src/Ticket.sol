SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import  "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Ticket is ERC721 {
    address internal owner;
    uint256 private nextTokenId;
    uint256 private eventId = 1;
    uint256[] internal ticketsForSale;

    mapping(address => bool) internal isSeller;
    mapping(address => bool) internal sellerRequests;
    mapping(uint256 => TicketInfo) internal ticketInfo;
    mapping(uint256 => EventInfo) internal eventInfo;
    mapping(string => uint256) internal eventIdByTitle;
    mapping(uint256 => mapping(address => uint256)) internal ownTickets;

    enum EventProgressInfo {
        Reserving,
        BeforeStart,
        Started,
        Finished,
        Cancled
    }

    struct TicketInfo {
        uint256 eventId;
        uint256 price;
        uint256 reservationPrice;
        bool isOnSale;
        bool isTraded;
        bool isUsed;
    }

    struct EventInfo {
        string title;
        uint256 eventId;
        address registrant;
        EventProgressInfo progressInfo;
        uint256 maxMintedTicketAmount;
        uint256 mintedTicketAmount;
        uint256 maxOwnableTicketAmount;
        bool reserved;
    }

    event EventCreated(address indexed creator, string title);
    event EventStarted(string title);
    event SellerApproved(address indexed seller);

    constructor() ERC721("Event Ticket", "TCKT") {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, unicode"관리자 권한이 필요합니다.");
        _;
    }

    modifier onlySeller() {
        require(isSeller[msg.sender], unicode"판매자 권한이 필요합니다.");
        _;
    }

    modifier OnlyEventRegistrant(string calldata _title) {
        require(eventIdByTitle[_title] != 0, unicode"해당 제목의 행사가 존재하지 않습니다.");
        require(eventInfo[eventIdByTitle[_title]].registrant == msg.sender, unicode"당신은 해당 행사의 관리자가 아닙니다.");
        _;
    }

    function transferFrom(address from, address to, uint256 tokenId) public pure override {
        revert(unicode"직접 티켓을 전송할 수 없습니다.");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public pure override {
        revert(unicode"직접 티켓을 전송할 수 없습니다.");
    }

    function approve(address, uint256) public pure override {
        revert(unicode"티켓 승인 기능을 사용할 수 없습니다.");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert(unicode"티켓 승인 기능을 사용할 수 없습니다.");
    }

    function checkMyAuth() external view returns (string memory) {
        if (msg.sender == owner) {
            return "owner";
        } else if (isSeller[msg.sender]) {
            return "seller";
        } else {
            return "user";
        }
    }

    function requestSeller() external {
        require(!isSeller[msg.sender], unicode"이미 판매자입니다.");
        require(!sellerRequests[msg.sender], unicode"요청이 존재합니다.");

        sellerRequests[msg.sender] = true;
    }

    function approveSellerRequest(address _user) external onlyOwner {
        require(!isSeller[_user], unicode"이미 판매자입니다.");
        require(sellerRequests[_user], unicode"요청이 존재하지않습니다.");

        sellerRequests[_user] = false;
        isSeller[_user] = true;

        emit SellerApproved(_user);
    }

    function stripSeller(address _user) external onlyOwner {
        require(isSeller[_user], unicode"판매자가 아닙니다.");

        isSeller[_user] = false;
    }

    function addEvent(string calldata _title, uint256 _maxTicketAmount, uint256 _maxOwnableTicketAmount) external onlySeller {
        require(eventIdByTitle[_title] == 0, unicode"해당 제목의 행사가 이미 존재합니다.");
        require(_maxTicketAmount > 0, unicode"최대 티켓량이 유효하지 않습니다.");
        require(_maxOwnableTicketAmount > 0, unicode"지갑별 최대 티켓 소유량이 유효하지 않습니다.");

        eventInfo[eventId] = EventInfo({
            title: _title,
            eventId: eventId,
            registrant: msg.sender,
            progressInfo: EventProgressInfo.BeforeStart,
            maxMintedTicketAmount: _maxTicketAmount,
            mintedTicketAmount: 0,
            maxOwnableTicketAmount: _maxOwnableTicketAmount,
            reserved: false
        });

        eventIdByTitle[_title] = eventId;

        eventId++;

        emit EventCreated(msg.sender, _title);
    }

    function startReservation(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        require(eventInfo[targetEventId].progressInfo == EventProgressInfo.BeforeStart && !eventInfo[targetEventId].reserved, unicode"행사가 예매를 시작할 수 없는 상태입니다.");

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Reserving;
    }

    function finishReservation(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        require(eventInfo[targetEventId].progressInfo == EventProgressInfo.Reserving, unicode"행사를 예매를 끝낼 수 없는 상태입니다.");

        for (uint256 i = 0; i < nextTokenId; i++) {
            if (ticketInfo[i].eventId == targetEventId && ownerOf(i) == eventInfo[targetEventId].registrant) {
                _burn(i);

                delete ticketInfo[i];
            }
        }

        eventInfo[targetEventId].progressInfo = EventProgressInfo.BeforeStart;

        eventInfo[targetEventId].reserved = true;
    }

    function startEvent(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        require(eventInfo[targetEventId].progressInfo == EventProgressInfo.BeforeStart && eventInfo[targetEventId].reserved, unicode"행사를 시작할 수 없는 상태입니다.");

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Started;

        emit EventStarted(_title);
    }

    function finishEvent(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        require(eventInfo[targetEventId].progressInfo == EventProgressInfo.Started, unicode"행사가 시작하기 전 입니다.");

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Finished;

        for (uint256 i = 0; i < nextTokenId; i++) {
            if (ticketInfo[i].eventId == targetEventId && ticketInfo[i].isOnSale) {
                ticketDownSale(i);
            }
        }
    }

    function cancleEvent(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        require(eventInfo[targetEventId].progressInfo == EventProgressInfo.BeforeStart, unicode"행사가 취소될 수 없는 상태입니다.");

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Cancled;

        if (eventInfo[targetEventId].reserved) {
            for (uint256 i = 0; i < nextTokenId; i++) {
                if (ticketInfo[i].eventId == targetEventId) {

                    if (ticketInfo[i].isOnSale) {
                        ticketDownSale(i);
                    }

                    if (!ticketInfo[i].isTraded) {
                        address buyer = ownerOf(i);
                        uint256 refundAmount = ticketInfo[i].reservationPrice;

                        (bool success, ) = payable(buyer).call{value: refundAmount}("");

                        require(success, unicode"환불에 실패했습니다.");
                    }

                    if (ownerOf(i) != eventInfo[targetEventId].registrant) {
                        ownTickets[targetEventId][ownerOf(i)]--;
                    }

                    _burn(i);

                    delete ticketInfo[i];
                }
            }
        }
    }

    function viewEventIdByTicket(uint256 _ticketId) external view returns (uint256) {
        return ticketInfo[_ticketId].eventId;
    }

    function viewEventInfoById(uint256 _eventId) external view returns (EventProgressInfo) {
        return eventInfo[_eventId].progressInfo;
    }

    function mintTicket(string calldata _title, uint256 _amount, uint256 _reservationPrice) external onlySeller OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        EventInfo storage eventData = eventInfo[targetEventId];

        require(eventData.progressInfo == EventProgressInfo.BeforeStart && !eventData.reserved, unicode"티켓을 발행할 수 없는 상태입니다.");
        require(_amount > 0, unicode"발행할 티켓 수가 유효하지 않습니다.");
        require(_reservationPrice > 0, unicode"예매 가격이 비정상적입니다.");
        require(eventData.mintedTicketAmount + _amount <= eventData.maxMintedTicketAmount, unicode"티켓 발행량 한도에 도달했습니다.");

        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = nextTokenId;

            _safeMint(msg.sender, tokenId);

            eventData.mintedTicketAmount++;

            ticketInfo[tokenId] = TicketInfo({
                eventId: targetEventId,
                price: _reservationPrice,
                reservationPrice: _reservationPrice,
                isOnSale: false,
                isTraded: false,
                isUsed: false
            });

            nextTokenId++;

            ticketOnReservation(tokenId);
        }
    }

    function ticketOnReservation(uint256 _ticketId) internal {
        ticketInfo[_ticketId].isOnSale = true;
    }

    function reserveTicket(uint256 _ticketId) external payable {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");
        require(eventInfo[ticketInfo[_ticketId].eventId].progressInfo == EventProgressInfo.Reserving, unicode"예매 기간이 아닙니다.");
        require(ticketInfo[_ticketId].isOnSale, unicode"예매 가능한 티켓이 아닙니다.");
        require(msg.value == ticketInfo[_ticketId].price, unicode"가격이 맞지 않습니다.");
        require(!isSeller[msg.sender], unicode"판매자는 티켓을 구매할 수 없습니다.");

        uint256 targetEventId =
            ticketInfo[_ticketId].eventId;

        require(ownTickets[targetEventId][msg.sender] < eventInfo[targetEventId].maxOwnableTicketAmount, unicode"콘서트 당 소유 가능 티켓 수에 도달했습니다.");
        require(ownerOf(_ticketId) == eventInfo[targetEventId].registrant, unicode"해당 티켓은 예매할 수 없습니다.");

        address sellerAddress = ownerOf(_ticketId);

        ticketInfo[_ticketId].isOnSale = false;
        ticketInfo[_ticketId].price = msg.value;

        ownTickets[targetEventId][msg.sender]++;

        _transfer(sellerAddress, msg.sender, _ticketId);
    }

    function buyTicket(uint256 _ticketId) external payable {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");
        require(ticketInfo[_ticketId].isOnSale, unicode"판매중인 티켓이 아닙니다.");
        require(eventInfo[ticketInfo[_ticketId].eventId].reserved && eventInfo[ticketInfo[_ticketId].eventId].progressInfo == EventProgressInfo.BeforeStart, unicode"티켓 구매가 불가능한 행사 상태 입니다.");
        require(msg.value == ticketInfo[_ticketId].price, unicode"가격이 맞지 않습니다.");
        require(!isSeller[msg.sender], unicode"판매자는 티켓을 구매할 수 없습니다.");

        uint256 targetEventId = ticketInfo[_ticketId].eventId;

        require(ownTickets[targetEventId][msg.sender] < eventInfo[targetEventId].maxOwnableTicketAmount, unicode"콘서트 당 소유 가능 티켓 수에 도달했습니다.");

        address sellerAddress = ownerOf(_ticketId);

        ticketDownSale(_ticketId);

        ticketInfo[_ticketId].price = msg.value;
        ticketInfo[_ticketId].isTraded = true;

        ownTickets[targetEventId][sellerAddress]--;
        ownTickets[targetEventId][msg.sender]++;

        _transfer(sellerAddress, msg.sender, _ticketId);

        (bool success, ) = payable(sellerAddress).call{value: msg.value}("");

        require(success, unicode"구매 실패");
    }

    function refundTicket(uint256 _ticketId) external {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");

        uint256 targetEventId = ticketInfo[_ticketId].eventId;

        require(eventInfo[targetEventId].progressInfo == EventProgressInfo.Reserving, unicode"현재 환불 가능한 기간이 아닙니다.");
        require(ownerOf(_ticketId) == msg.sender, unicode"해당 티켓을 소유하고 있지 않습니다.");
        require(!ticketInfo[_ticketId].isTraded, unicode"거래된 티켓은 환불받을 수 없습니다.");
        require(!ticketInfo[_ticketId].isOnSale, unicode"판매중인 티켓은 환불받을 수 없습니다.");

        uint256 refundPrice =
            ticketInfo[_ticketId].reservationPrice;

        address sellerAddress =
            eventInfo[targetEventId].registrant;

        ownTickets[targetEventId][msg.sender]--;

        _burn(_ticketId);

        _safeMint(sellerAddress, _ticketId);

        ticketInfo[_ticketId] = TicketInfo({
            eventId: targetEventId,
            price: refundPrice,
            reservationPrice: refundPrice,
            isOnSale: false,
            isTraded: false,
            isUsed: false
        });

        ticketOnReservation(_ticketId);

        (bool success, ) = payable(msg.sender).call{value: refundPrice}("");

        require(success, unicode"환불에 실패하였습니다.");
    }

    function viewTicketOwner(uint256 _ticketId) external view returns (address) {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");

        return ownerOf(_ticketId);
    }

    function viewTicketsOnSale() external view returns (uint256[] memory)
    {
        return ticketsForSale;
    }

    function searchTicketOnSale(uint256 _ticketId) external view returns (string memory) {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");

        if (ticketInfo[_ticketId].isOnSale) {
            return unicode"해당 티켓이 판매 중 입니다.";
        } else {
            return unicode"해당 티켓은 판매 중이 아닙니다.";
        }
    }

    function ticketOnSale(uint256 _ticketId, uint256 _price) external {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");
        require(ownerOf(_ticketId) == msg.sender, unicode"해당 티켓을 소유하지 않았습니다.");
        require(!ticketInfo[_ticketId].isUsed, unicode"해당 티켓은 판매할 수 없는 상태입니다.");
        require(!ticketInfo[_ticketId].isOnSale, unicode"해당 티켓은 이미 판매 중입니다.");
        require(_price <= ticketInfo[_ticketId].reservationPrice, unicode"최대 판매 등록 가격을 초과했습니다.");
        require(eventInfo[ticketInfo[_ticketId].eventId].progressInfo == EventProgressInfo.BeforeStart && eventInfo[ticketInfo[_ticketId].eventId].reserved, unicode"티켓 판매가 불가한 행사 상태 입니다.");

        ticketInfo[_ticketId].price = _price;
        ticketInfo[_ticketId].isOnSale = true;

        ticketsForSale.push(_ticketId);
    }

    function ticketDownSale(uint256 _ticketId) internal {
        require(_ticketId < nextTokenId,unicode"해당 티켓은 발행되지 않았습니다.");
        require(ticketInfo[_ticketId].isOnSale, unicode"해당 티켓은 판매 중이 아닙니다.");

        for (uint256 i = 0; i < ticketsForSale.length; i++) {
            if (ticketsForSale[i] == _ticketId) {
                ticketsForSale[i] = ticketsForSale[ticketsForSale.length - 1];

                ticketsForSale.pop();

                break;
            }
        }

        ticketInfo[_ticketId].isOnSale = false;
    }

    function useTicket(uint256 _ticketId) external {
        require(_ticketId < nextTokenId, unicode"해당 티켓은 발행되지 않았습니다.");
        require(ownerOf(_ticketId) == msg.sender, unicode"본인이 소유한 티켓이 아닙니다.");
        require(!ticketInfo[_ticketId].isUsed, unicode"이미 사용된 티켓입니다.");
        require(eventInfo[ticketInfo[_ticketId].eventId].progressInfo == EventProgressInfo.Started, unicode"진행 중인 행사가 아닙니다.");

        ticketInfo[_ticketId].isUsed = true;
    }
}
