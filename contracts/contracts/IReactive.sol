// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Standard Reactive Network interfaces and constants

uint256 constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;

interface IPayer {
    function pay() external payable;
}

interface IReactive is IPayer {
    /**
     * @notice Event log structure from origin chain
     * @dev 12-field LogRecord as per Reactive Network specification
     */
    struct LogRecord {
        uint256 chain_id;
        address _contract;
        uint256 topic_0;
        uint256 topic_1;
        uint256 topic_2;
        uint256 topic_3;
        bytes data;
        uint256 block_number;
        uint256 op_code;
        uint256 block_hash;
        uint256 tx_hash;
        uint256 log_index;
    }

    /**
     * @notice Callback event to trigger cross-chain execution
     * @param chain_id Destination chain ID
     * @param _contract Target contract address
     * @param gas_limit Gas limit for execution
     * @param payload Encoded function call
     */
    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes payload
    );

    /**
     * @notice Main reactive function triggered by subscribed events
     * @param log Event log data from origin chain
     */
    function react(LogRecord calldata log) external;
}

interface ISystemContract {
    /**
     * @notice Subscribe to events on origin chain
     * @param chain_id Origin chain ID
     * @param contract_address Contract to monitor
     * @param topic_0 Event signature
     * @param topic_1 First indexed parameter (or REACTIVE_IGNORE)
     * @param topic_2 Second indexed parameter (or REACTIVE_IGNORE)
     * @param topic_3 Third indexed parameter (or REACTIVE_IGNORE)
     */
    function subscribe(
        uint256 chain_id,
        address contract_address,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    /**
     * @notice Unsubscribe from events
     */
    function unsubscribe(
        uint256 chain_id,
        address contract_address,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;
}

