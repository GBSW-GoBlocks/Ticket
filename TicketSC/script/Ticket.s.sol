// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {Script} from "forge-std/Script.sol";
import {Ticket} from "../src/Ticket.sol";

contract TicketScript is Script {
    function run() external returns (Ticket ticket) {
        // 서명자는 CLI 옵션(--account <keystore> 또는 --private-key)으로 지정한다. 키를 환경변수에 두지 않는다.
        vm.startBroadcast();
        ticket = new Ticket();
        vm.stopBroadcast();
    }
}