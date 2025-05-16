// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// Import the Types library for managing ciphertexts
import {TypesLib} from "blocklock-solidity/src/libraries/TypesLib.sol";
// Import the AbstractBlocklockReceiver for handling blocklock decryption & callbacks
import {AbstractBlocklockReceiver} from "blocklock-solidity/src/AbstractBlocklockReceiver.sol";

/// @notice This contract is used for testing only and should not be used for production.
contract MockBlocklockStringReceiver is AbstractBlocklockReceiver {
    
    uint256 public currentRequestId;

    struct Request {
        address requestedBy;                 
        uint32 encryptedAt;                  
        uint32 decryptedAt;                  
        TypesLib.Ciphertext encryptedValue; 
        string message;                     
    }

    mapping(uint256 => Request) public userRequests;

    constructor(address blocklockContract) AbstractBlocklockReceiver(blocklockContract) {}

    function createTimelockRequestWithDirectFunding(
        uint32 callbackGasLimit,
        uint32 _encryptedAt,
        uint32 _decryptedAt,
        bytes calldata condition,
        TypesLib.Ciphertext calldata encryptedData
    ) external returns (uint256, uint256) {
        // create timelock request
        (uint256 requestID, uint256 requestPrice) =
            _requestBlocklockPayInNative(callbackGasLimit, condition, encryptedData);
        // store request id
        currentRequestId = requestID;
        // store Ciphertext
        userRequests[requestID] = Request({
        requestedBy: msg.sender,
        encryptedAt: _encryptedAt,
        decryptedAt: _decryptedAt,
        encryptedValue: encryptedData,
        message:""
    });

        return (requestID, requestPrice);
    }

    function createTimelockRequestWithSubscription(
        uint32 callbackGasLimit,
        uint32 _encryptedAt,
        uint32 _decryptedAt,
        bytes calldata condition,
        TypesLib.Ciphertext calldata encryptedData
    ) external returns (uint256) {
        // create timelock request
        uint256 requestID = _requestBlocklockWithSubscription(callbackGasLimit, condition, encryptedData);
        // store request id
        currentRequestId = requestID;
        // store Ciphertext
        userRequests[requestID] = Request({
        requestedBy: msg.sender,
        encryptedAt: _encryptedAt,
        decryptedAt: _decryptedAt,
        encryptedValue: encryptedData,
        message: ""
    });
        return requestID;
    }

    function _onBlocklockReceived(uint256 _requestId, bytes calldata decryptionKey) internal override {
        require(currentRequestId >= _requestId, "Invalid request id");
        Request storage request = userRequests[_requestId];
        request.message = abi.decode(_decrypt(request.encryptedValue, decryptionKey), (string));
    }
}