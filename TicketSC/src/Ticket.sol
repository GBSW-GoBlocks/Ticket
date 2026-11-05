//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract Ticket is ERC721 {
    address internal owner;
    uint256 private nextTokenId;
    uint256 private eventId = 1;
    uint256[] internal ticketsForSale;

    // 행사별 티켓 id 목록(전체 순회 대신 사용)과 판매 목록 인덱스(index + 1, 0이면 목록에 없음)
    mapping(uint256 => uint256[]) internal eventTicketIds;
    mapping(uint256 => uint256) internal listIndex;

    // 한 행사의 티켓 수와 발행 1회 수량 상한: 상태 전환 반복문이 블록 가스 한도를 넘지 않게 한다.
    uint256 public constant MAX_EVENT_TICKETS = 300;
    uint256 public constant MAX_MINT_BATCH = 100;
    // CIDv0은 46자, CIDv1(base32)은 보통 59자라서 여유를 두고 상한을 둔다.
    uint256 public constant MAX_CID_LENGTH = 100;

    mapping(address => bool) internal isSeller;
    mapping(address => bool) internal sellerRequests;
    mapping(address => uint256) public withdrawableBalance;
    // 예매금은 환불 재원으로 공연 시작(또는 행사 취소) 전까지 행사별로 묶어 둔다.
    mapping(uint256 => uint256) public eventEscrow;
    mapping(uint256 => TicketInfo) internal ticketInfo;
    mapping(uint256 => EventInfo) internal eventInfo;
    mapping(string => uint256) internal eventIdByTitle;
    mapping(uint256 => mapping(address => uint256)) internal ownTickets;

    string public defaultImageIpfs = "bafkreigu624xthfaay7n4qae4lsuu325f2ijkglztf4uahl2r3xtnbxh5y";

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
        string imageIpfs;
        EventProgressInfo progressInfo;
        uint256 maxMintedTicketAmount;
        uint256 mintedTicketAmount;
        uint256 maxOwnableTicketAmount;
        bool reserved;
    }

    // 사용자에게 보여줄 한글 문구는 프론트에서 에러 이름으로 매핑한다.
    error NotAdmin();
    error NotSeller();
    error NotRegistrant();
    error EventNotFound();
    error EventExists();
    error InvalidAmount();
    error InvalidPrice();
    error BadState();
    error MintLimit();
    error TransferDisabled();
    error ApprovalDisabled();
    error AlreadySeller();
    error NotASeller();
    error RequestExists();
    error NoRequest();
    error SellerCannotBuy();
    error NotReserving();
    error NoSuchTicket();
    error NotForSale();
    error NotOnSale();
    error WrongPrice();
    error OwnLimit();
    error NotPrimaryTicket();
    error NotTicketOwner();
    error TicketTraded();
    error TicketOnSale();
    error TicketUsed();
    error AlreadyUsed();
    error PriceTooHigh();
    error NothingToWithdraw();
    error TransferFailed();
    error NotCancled();
    error InvalidImage();

    event EventCreated(address indexed creator, uint256 indexed eventId, string title);
    event EventStarted(string title);
    event EventStateChanged(uint256 indexed eventId, EventProgressInfo state);
    event SellerRequested(address indexed user);
    event SellerApproved(address indexed seller);
    event SellerStripped(address indexed seller);
    event ProceedsWithdrawn(address indexed seller, uint256 amount);
    event TicketReserved(uint256 indexed eventId, uint256 indexed ticketId, address indexed buyer, uint256 price);
    event TicketResold(uint256 indexed eventId, uint256 indexed ticketId, address indexed buyer, uint256 price);
    event TicketRefunded(uint256 indexed eventId, uint256 indexed ticketId, address indexed buyer, uint256 amount);
    event TicketListed(uint256 indexed ticketId, uint256 price);
    event TicketUnlisted(uint256 indexed ticketId);
    event defaultImageChanged(string imageIpfs);
    event eventImageChanged(string title, string imageIpfs);

    constructor() ERC721("Event Ticket", "TCKT") {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAdmin();
        _;
    }

    modifier onlySeller() {
        if (!isSeller[msg.sender]) revert NotSeller();
        _;
    }

    modifier OnlyEventRegistrant(string calldata _title) {
        if (eventIdByTitle[_title] == 0) revert EventNotFound();
        if (eventInfo[eventIdByTitle[_title]].registrant != msg.sender) revert NotRegistrant();
        _;
    }

    function transferFrom(address, address, uint256) public pure override {
        revert TransferDisabled();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert TransferDisabled();
    }

    function approve(address, uint256) public pure override {
        revert ApprovalDisabled();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert ApprovalDisabled();
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
        if (isSeller[msg.sender]) revert AlreadySeller();
        if (sellerRequests[msg.sender]) revert RequestExists();

        sellerRequests[msg.sender] = true;

        emit SellerRequested(msg.sender);
    }

    function approveSellerRequest(address _user) external onlyOwner {
        if (isSeller[_user]) revert AlreadySeller();
        if (!sellerRequests[_user]) revert NoRequest();

        sellerRequests[_user] = false;
        isSeller[_user] = true;

        emit SellerApproved(_user);
    }

    function stripSeller(address _user) external onlyOwner {
        if (!isSeller[_user]) revert NotASeller();

        isSeller[_user] = false;

        emit SellerStripped(_user);
    }

    function sellerStatus(address _user) external view returns (bool seller, bool requested) {
        return (isSeller[_user], sellerRequests[_user]);
    }

    function addEvent(string calldata _title, uint256 _maxTicketAmount, uint256 _maxOwnableTicketAmount, string calldata _imageIpfs) external onlySeller {
        if (eventIdByTitle[_title] != 0) revert EventExists();
        if (_maxTicketAmount == 0 || _maxOwnableTicketAmount == 0 || _maxTicketAmount > MAX_EVENT_TICKETS) revert InvalidAmount();
        _checkCid(_imageIpfs);

        eventInfo[eventId] = EventInfo({
            title: _title,
            eventId: eventId,
            registrant: msg.sender,
            imageIpfs: _imageIpfs,
            progressInfo: EventProgressInfo.BeforeStart,
            maxMintedTicketAmount: _maxTicketAmount,
            mintedTicketAmount: 0,
            maxOwnableTicketAmount: _maxOwnableTicketAmount,
            reserved: false
        });

        eventIdByTitle[_title] = eventId;

        emit EventCreated(msg.sender, eventId, _title);

        eventId++;
    }

    function startReservation(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.BeforeStart || eventInfo[targetEventId].reserved) revert BadState();

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Reserving;

        emit EventStateChanged(targetEventId, EventProgressInfo.Reserving);
    }

    function finishReservation(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.Reserving) revert BadState();

        // 판매되지 않아 주최자가 들고 있는 티켓만 소각한다. (이 행사의 티켓 목록만 순회)
        uint256[] storage ids = eventTicketIds[targetEventId];
        for (uint256 i = 0; i < ids.length; i++) {
            if (_ownerOf(ids[i]) == eventInfo[targetEventId].registrant) {
                _burn(ids[i]);

                delete ticketInfo[ids[i]];
            }
        }

        eventInfo[targetEventId].progressInfo = EventProgressInfo.BeforeStart;

        eventInfo[targetEventId].reserved = true;

        emit EventStateChanged(targetEventId, EventProgressInfo.BeforeStart);
    }

    function startEvent(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.BeforeStart || !eventInfo[targetEventId].reserved) revert BadState();

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Started;

        // 공연이 시작되면 더 이상 환불·취소가 없으므로 묶어 둔 예매금을 정산 가능 잔액으로 푼다.
        withdrawableBalance[eventInfo[targetEventId].registrant] += eventEscrow[targetEventId];
        eventEscrow[targetEventId] = 0;

        emit EventStarted(_title);
        emit EventStateChanged(targetEventId, EventProgressInfo.Started);
    }

    function finishEvent(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.Started) revert BadState();

        // 종료 이후에는 모든 구매 경로가 행사 상태를 검사하므로 판매 목록을 일일이 내리지 않는다.
        eventInfo[targetEventId].progressInfo = EventProgressInfo.Finished;

        emit EventStateChanged(targetEventId, EventProgressInfo.Finished);
    }

    // 취소는 상태만 바꾼다. 환불은 예매자가 claimRefund로 직접 받는다. (받는 지갑이 거부해도 취소가 막히지 않음)
    function cancleEvent(string calldata _title) external OnlyEventRegistrant(_title) {
        uint256 targetEventId = eventIdByTitle[_title];

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.BeforeStart) revert BadState();

        eventInfo[targetEventId].progressInfo = EventProgressInfo.Cancled;

        emit EventStateChanged(targetEventId, EventProgressInfo.Cancled);
    }

    // 기본 이미지는 비울 수 없다. (이미지를 지정하지 않은 행사가 모두 이 값을 쓴다)
    function setDefaultEventImage(string calldata _ipfs) external onlyOwner() {
        if (bytes(_ipfs).length == 0) revert InvalidImage();
        _checkCid(_ipfs);

        defaultImageIpfs = _ipfs;

        emit defaultImageChanged(_ipfs);
    }

    // 빈 값을 넣으면 다시 기본 이미지를 쓴다.
    function setEventImage(string calldata _ipfs, string calldata  _title) external OnlyEventRegistrant(_title) {
        _checkCid(_ipfs);

        eventInfo[eventIdByTitle[_title]].imageIpfs = _ipfs;

        emit eventImageChanged(_title, _ipfs);
    }

    // 이미지는 ipfs:// 접두사 없이 CID(영문·숫자)만 저장한다. 접두사는 tokenURI가 붙이고,
    // 따옴표 등이 들어가 메타데이터 JSON이 깨지는 것도 막는다. 빈 값은 허용한다.
    function _checkCid(string calldata _cid) internal pure {
        bytes calldata b = bytes(_cid);

        if (b.length > MAX_CID_LENGTH) revert InvalidImage();

        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];

            if (!((c >= "0" && c <= "9") || (c >= "A" && c <= "Z") || (c >= "a" && c <= "z"))) revert InvalidImage();
        }
    }

    // 취소된 행사에서 최초 예매자가 그대로 보유한 티켓의 예매금을 환불받는다. 양도된 티켓은 환불하지 않는다.
    function claimRefund(uint256 _ticketId) external {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();

        uint256 targetEventId = ticketInfo[_ticketId].eventId;

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.Cancled) revert NotCancled();
        if (ownerOf(_ticketId) != msg.sender) revert NotTicketOwner();
        if (ticketInfo[_ticketId].isTraded) revert TicketTraded();

        uint256 refundAmount = ticketInfo[_ticketId].reservationPrice;

        if (ticketInfo[_ticketId].isOnSale) {
            _downSale(_ticketId);
        }

        ownTickets[targetEventId][msg.sender]--;
        eventEscrow[targetEventId] -= refundAmount;

        _burn(_ticketId);

        delete ticketInfo[_ticketId];

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit TicketRefunded(targetEventId, _ticketId, msg.sender, refundAmount);
    }

    function eventCount() external view returns (uint256) {
        return eventId - 1;
    }

    function viewEvent(uint256 _eventId) external view returns (EventInfo memory) {
        if (eventInfo[_eventId].eventId == 0) revert EventNotFound();

        return eventInfo[_eventId];
    }

    function ticketDetail(uint256 _ticketId) external view returns (TicketInfo memory) {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();

        return ticketInfo[_ticketId];
    }

    function ownTicketCount(uint256 _eventId, address _user) external view returns (uint256) {
        return ownTickets[_eventId][_user];
    }

    function ticketCount() external view returns (uint256) {
        return nextTokenId;
    }

    // 소각된 티켓은 owner가 address(0)이고 정보가 비어 있다.
    function viewTickets(uint256 _from, uint256 _count) external view returns (address[] memory owners, TicketInfo[] memory infos) {
        uint256 end = _from + _count;
        if (end > nextTokenId) end = nextTokenId;
        uint256 n = end > _from ? end - _from : 0;

        owners = new address[](n);
        infos = new TicketInfo[](n);

        for (uint256 i = 0; i < n; i++) {
            owners[i] = _ownerOf(_from + i);
            infos[i] = ticketInfo[_from + i];
        }
    }

    // 행사 id는 1부터 시작한다.
    function viewEvents(uint256 _fromId, uint256 _count) external view returns (EventInfo[] memory list) {
        uint256 end = _fromId + _count;
        if (end > eventId) end = eventId;
        uint256 n = end > _fromId ? end - _fromId : 0;

        list = new EventInfo[](n);

        for (uint256 i = 0; i < n; i++) {
            list[i] = eventInfo[_fromId + i];
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

        if (eventData.progressInfo != EventProgressInfo.BeforeStart || eventData.reserved) revert BadState();
        if (_amount == 0 || _amount > MAX_MINT_BATCH) revert InvalidAmount();
        if (_reservationPrice == 0) revert InvalidPrice();
        if (eventData.mintedTicketAmount + _amount > eventData.maxMintedTicketAmount) revert MintLimit();

        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = nextTokenId;

            _safeMint(msg.sender, tokenId);

            eventData.mintedTicketAmount++;

            ticketInfo[tokenId] = TicketInfo({
                eventId: targetEventId,
                price: _reservationPrice,
                reservationPrice: _reservationPrice,
                isOnSale: true,
                isTraded: false,
                isUsed: false
            });

            eventTicketIds[targetEventId].push(tokenId);

            nextTokenId++;
        }
    }

    function reserveTicket(uint256 _ticketId) external payable {
        if (isSeller[msg.sender]) revert SellerCannotBuy();
        if (eventInfo[ticketInfo[_ticketId].eventId].progressInfo != EventProgressInfo.Reserving) revert NotReserving();
        if (_ticketId >= nextTokenId) revert NoSuchTicket();
        if (!ticketInfo[_ticketId].isOnSale) revert NotForSale();
        if (msg.value != ticketInfo[_ticketId].price) revert WrongPrice();

        uint256 targetEventId = ticketInfo[_ticketId].eventId;

        if (ownTickets[targetEventId][msg.sender] >= eventInfo[targetEventId].maxOwnableTicketAmount) revert OwnLimit();
        if (ownerOf(_ticketId) != eventInfo[targetEventId].registrant) revert NotPrimaryTicket();

        address sellerAddress = ownerOf(_ticketId);

        ticketInfo[_ticketId].isOnSale = false;
        ticketInfo[_ticketId].price = msg.value;
        eventEscrow[targetEventId] += msg.value;

        ownTickets[targetEventId][msg.sender]++;

        _transfer(sellerAddress, msg.sender, _ticketId);

        emit TicketReserved(targetEventId, _ticketId, msg.sender, msg.value);
    }

    function buyTicket(uint256 _ticketId) external payable {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();
        if (!ticketInfo[_ticketId].isOnSale) revert NotForSale();
        if (!eventInfo[ticketInfo[_ticketId].eventId].reserved || eventInfo[ticketInfo[_ticketId].eventId].progressInfo != EventProgressInfo.BeforeStart) revert BadState();
        if (msg.value != ticketInfo[_ticketId].price) revert WrongPrice();
        if (isSeller[msg.sender]) revert SellerCannotBuy();

        uint256 targetEventId = ticketInfo[_ticketId].eventId;

        if (ownTickets[targetEventId][msg.sender] >= eventInfo[targetEventId].maxOwnableTicketAmount) revert OwnLimit();

        address sellerAddress = ownerOf(_ticketId);

        _downSale(_ticketId);

        // 첫 양도가 되면 최초 예매금은 더 이상 환불 대상이 아니므로 에스크로에서 주최자 정산 잔액으로 옮긴다.
        if (!ticketInfo[_ticketId].isTraded) {
            uint256 primary = ticketInfo[_ticketId].reservationPrice;
            eventEscrow[targetEventId] -= primary;
            withdrawableBalance[eventInfo[targetEventId].registrant] += primary;
        }

        ticketInfo[_ticketId].price = msg.value;
        ticketInfo[_ticketId].isTraded = true;

        ownTickets[targetEventId][sellerAddress]--;
        ownTickets[targetEventId][msg.sender]++;

        _transfer(sellerAddress, msg.sender, _ticketId);

        // 재판매 대금은 즉시 전송하지 않고 판매자의 출금 가능 잔액으로 적립합니다.
        withdrawableBalance[sellerAddress] += msg.value;

        emit TicketResold(targetEventId, _ticketId, msg.sender, msg.value);
    }

    function refundTicket(uint256 _ticketId) external {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();

        uint256 targetEventId = ticketInfo[_ticketId].eventId;

        if (eventInfo[targetEventId].progressInfo != EventProgressInfo.Reserving) revert NotReserving();
        if (ownerOf(_ticketId) != msg.sender) revert NotTicketOwner();
        if (ticketInfo[_ticketId].isTraded) revert TicketTraded();
        if (ticketInfo[_ticketId].isOnSale) revert TicketOnSale();

        uint256 refundPrice = ticketInfo[_ticketId].reservationPrice;
        address sellerAddress = eventInfo[targetEventId].registrant;

        ownTickets[targetEventId][msg.sender]--;
        eventEscrow[targetEventId] -= refundPrice;

        _burn(_ticketId);

        _safeMint(sellerAddress, _ticketId);

        ticketInfo[_ticketId] = TicketInfo({
            eventId: targetEventId,
            price: refundPrice,
            reservationPrice: refundPrice,
            isOnSale: true,
            isTraded: false,
            isUsed: false
        });

        (bool success, ) = payable(msg.sender).call{value: refundPrice}("");

        if (!success) revert TransferFailed();

        emit TicketRefunded(targetEventId, _ticketId, msg.sender, refundPrice);
    }

    function viewTicketOwner(uint256 _ticketId) external view returns (address) {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();

        return ownerOf(_ticketId);
    }

    function viewTicketsOnSale() external view returns (uint256[] memory) {
        return ticketsForSale;
    }

    function viewTicketPrice(uint256 _ticketId) external view returns(uint256) {
        return ticketInfo[_ticketId].price;
    }

    function ticketOnSale(uint256 _ticketId, uint256 _price) external {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();
        if (ownerOf(_ticketId) != msg.sender) revert NotTicketOwner();
        if (ticketInfo[_ticketId].isUsed) revert TicketUsed();
        if (ticketInfo[_ticketId].isOnSale) revert TicketOnSale();
        if (_price > ticketInfo[_ticketId].reservationPrice) revert PriceTooHigh();
        if (eventInfo[ticketInfo[_ticketId].eventId].progressInfo != EventProgressInfo.BeforeStart || !eventInfo[ticketInfo[_ticketId].eventId].reserved) revert BadState();

        ticketInfo[_ticketId].price = _price;
        ticketInfo[_ticketId].isOnSale = true;

        ticketsForSale.push(_ticketId);
        listIndex[_ticketId] = ticketsForSale.length;

        emit TicketListed(_ticketId, _price);
    }

    // 소유자 확인 없이 판매 상태만 내린다. 판매 목록에서는 마지막 항목과 자리를 바꿔 O(1)로 제거한다.
    function _downSale(uint256 _ticketId) internal {
        uint256 idx = listIndex[_ticketId];

        if (idx != 0) {
            uint256 last = ticketsForSale[ticketsForSale.length - 1];

            ticketsForSale[idx - 1] = last;
            listIndex[last] = idx;

            ticketsForSale.pop();

            delete listIndex[_ticketId];
        }

        ticketInfo[_ticketId].isOnSale = false;

        emit TicketUnlisted(_ticketId);
    }

    function ticketDownSale(uint256 _ticketId) external {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();
        if (!ticketInfo[_ticketId].isOnSale) revert NotOnSale();
        if (ownerOf(_ticketId) != msg.sender) revert NotTicketOwner();

        _downSale(_ticketId);
    }

    function useTicket(uint256 _ticketId) external {
        if (_ticketId >= nextTokenId) revert NoSuchTicket();
        if (ownerOf(_ticketId) != msg.sender) revert NotTicketOwner();
        if (ticketInfo[_ticketId].isUsed) revert AlreadyUsed();
        if (eventInfo[ticketInfo[_ticketId].eventId].progressInfo != EventProgressInfo.Started) revert BadState();

        ticketInfo[_ticketId].isUsed = true;
    }

    function withdrawProceeds() external {
        uint256 amount = withdrawableBalance[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        withdrawableBalance[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit ProceedsWithdrawn(msg.sender, amount);
    }

    function tokenURI(uint256 _ticketId) public view override returns (string memory) {
        _requireOwned(_ticketId);

        string memory image = eventInfo[ticketInfo[_ticketId].eventId].imageIpfs;
        if (bytes(image).length == 0) image = defaultImageIpfs;

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(abi.encodePacked(
                '{"name":"Ticket #', Strings.toString(_ticketId), '","image":"ipfs://', image, '"}'
            ))
        );
    }
}
