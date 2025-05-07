export const CONTRACT_ADDRESS = "0xe6E58e5F3A82B83b9cb6f23cdf1e73e288E69B3D"

export const CONTRACT_ABI = [
	{
		"inputs": [],
		"name": "acceptOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "createSubscriptionAndFundNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint32",
				"name": "callbackGasLimit",
				"type": "uint32"
			},
			{
				"internalType": "bytes",
				"name": "condition",
				"type": "bytes"
			},
			{
				"components": [
					{
						"components": [
							{
								"internalType": "uint256[2]",
								"name": "x",
								"type": "uint256[2]"
							},
							{
								"internalType": "uint256[2]",
								"name": "y",
								"type": "uint256[2]"
							}
						],
						"internalType": "struct BLS.PointG2",
						"name": "u",
						"type": "tuple"
					},
					{
						"internalType": "bytes",
						"name": "v",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "w",
						"type": "bytes"
					}
				],
				"internalType": "struct TypesLib.Ciphertext",
				"name": "encryptedData",
				"type": "tuple"
			}
		],
		"name": "createTimelockRequestWithDirectFunding",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint32",
				"name": "callbackGasLimit",
				"type": "uint32"
			},
			{
				"internalType": "bytes",
				"name": "condition",
				"type": "bytes"
			},
			{
				"components": [
					{
						"components": [
							{
								"internalType": "uint256[2]",
								"name": "x",
								"type": "uint256[2]"
							},
							{
								"internalType": "uint256[2]",
								"name": "y",
								"type": "uint256[2]"
							}
						],
						"internalType": "struct BLS.PointG2",
						"name": "u",
						"type": "tuple"
					},
					{
						"internalType": "bytes",
						"name": "v",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "w",
						"type": "bytes"
					}
				],
				"internalType": "struct TypesLib.Ciphertext",
				"name": "encryptedData",
				"type": "tuple"
			}
		],
		"name": "createTimelockRequestWithSubscription",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "fundContractNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "blocklockContract",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Funded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "subscriptionId",
				"type": "uint256"
			}
		],
		"name": "NewSubscriptionId",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "OwnershipTransferRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestID",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "decryptionKey",
				"type": "bytes"
			}
		],
		"name": "receiveBlocklock",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "Received",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_blocklock",
				"type": "address"
			}
		],
		"name": "setBlocklock",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "subId",
				"type": "uint256"
			}
		],
		"name": "setSubId",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "topUpSubscriptionNative",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "consumers",
				"type": "address[]"
			}
		],
		"name": "updateSubscription",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Withdrawn",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			}
		],
		"name": "withdrawNative",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "blocklock",
		"outputs": [
			{
				"internalType": "contract IBlocklockSender",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "encryptedValue",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256[2]",
						"name": "x",
						"type": "uint256[2]"
					},
					{
						"internalType": "uint256[2]",
						"name": "y",
						"type": "uint256[2]"
					}
				],
				"internalType": "struct BLS.PointG2",
				"name": "u",
				"type": "tuple"
			},
			{
				"internalType": "bytes",
				"name": "v",
				"type": "bytes"
			},
			{
				"internalType": "bytes",
				"name": "w",
				"type": "bytes"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "plainTextValue",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "requestId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "subscriptionId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]