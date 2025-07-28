'use client';
import React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { useAccount, useWalletClient } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import Header from './header';
import Wallet from '../wallet';
import { ethers, getBytes } from "ethers";
import { Blocklock, encodeCiphertextToSolidity, encodeCondition } from "blocklock-js";

interface EncryptedMessage {
  id: number,
  requestedBy: string | undefined,
  encryptedAt: string,
  decryptedAt: string,
  message: string,
}

const BlockLockPage = () => {

  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('text');
  const [userMessage, setUserMessage] = useState('');
  const [decryptionTime, setDecryptionTime] = useState('');
  const [requests, setRequests] = useState<EncryptedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: walletClient } = useWalletClient();

  const handleEncrypt = async () => {
    if (!userMessage || !decryptionTime) {
      alert('Please enter both text and decryption time');
      return;
    }

    if (!walletClient) {
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const jsonProvider = new ethers.JsonRpcProvider(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`);
      const signer = await provider.getSigner();
      console.log(signer);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Calculate target block height based on decryption time
      const currentBlock = await provider.getBlockNumber();
      const currentBlockData = await provider.getBlock(currentBlock);
      const currentTimestamp = currentBlockData?.timestamp || Math.floor(Date.now() / 1000);

      const targetTimestamp = Math.floor(new Date(decryptionTime).getTime() / 1000);
      const secondsPerBlock = 12; // Base layer blocks are ~12 seconds
      const blocksToAdd = Math.ceil((targetTimestamp - currentTimestamp) / secondsPerBlock);

      const blockHeight = BigInt(currentBlock + blocksToAdd);
      console.log(`Current block: ${currentBlock}, Target block: ${blockHeight.toString()}`);

      // Set the message to encrypt
      const msgBytes = ethers.AbiCoder.defaultAbiCoder().encode(["string"], [userMessage]);
      const encodedMessage = getBytes(msgBytes);
      console.log("Encoded message:", encodedMessage);

      // Encrypt the encoded message usng Blocklock.js library
      const blocklockjs = Blocklock.createBaseSepolia(jsonProvider);
      const cipherMessage = blocklockjs.encrypt(encodedMessage, blockHeight);
      console.log("Ciphertext:", cipherMessage);
      // Set the callback gas limit and price
      // Best practice is to estimate the callback gas limit e.g., by extracting gas reports from Solidity tests
      const callbackGasLimit = 700_000;
      // Based on the callbackGasLimit, we can estimate the request price by calling BlocklockSender
      // Note: Add a buffer to the estimated request price to cover for fluctuating gas prices between blocks
      console.log(BigInt(callbackGasLimit));
      const [requestCallBackPrice] = await blocklockjs.calculateRequestPriceNative(BigInt(callbackGasLimit))
      console.log("Request CallBack price:", ethers.formatEther(requestCallBackPrice), "ETH");
      const conditionBytes = encodeCondition(blockHeight);

      const tx = await contract.createTimelockRequestWithDirectFunding(
        callbackGasLimit,
        currentBlock,
        blockHeight,
        conditionBytes,
        encodeCiphertextToSolidity(cipherMessage),
        { value: requestCallBackPrice }
      );

      const receipt = await tx.wait(1);
      if (!receipt) throw new Error("Transaction has not been mined");

      setActiveTab('decrypt');
      setUserMessage(''); // Clear the input
      setDecryptionTime(''); // Clear the time input

    } catch (error) {
      console.error('Contract write failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  };

  const fetchRequest = async () => {
    setLoading(true)
    setActiveTab('decrypt')
    try {
      if (!walletClient) {
        return;
      }
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const requestIdCount = await contract.currentRequestId();
      console.log("Request ID: ", requestIdCount)
      const temp = [];
      for (let i = 128; i <= requestIdCount; i++) {
        console.log(i)
        const r = await contract.userRequests(i);
        if (r.requestedBy == address) {

          temp.push({
            id: i,
            requestedBy: r[0],
            encryptedAt: r[1],
            decryptedAt: r[2],
            message: r[4],
          });
        }
      }
      setRequests(temp);
    } catch (err) {
      console.error("Error fetching request:", err);
    }
    setLoading(false);

  }

  return (
    isConnected ? (
      <div className="bg-white-pattern">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 font-sans">
          {/* Tabs - Stack on mobile, side by side on desktop */}
          <div className="flex flex-col sm:flex-row justify-end mb-6 gap-2 sm:gap-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <button
                className={`w-full sm:w-[200px] py-3 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${activeTab === 'text' ? 'border-gray-400 bg-white' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                Encrypt
              </button>
              <button
                className={`w-full sm:w-[200px] py-3 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${activeTab === 'decrypt' ? 'border-gray-400 bg-white' : ''}`}
                onClick={() => fetchRequest()}
              >
                Explorer
              </button>
            </div>
          </div>
          {activeTab === 'text' ? (
            <div className="bg-white border border-gray-200 p-4 sm:p-8 h-[480px]">
              {/* Text Areas Section - Stack on mobile, side by side on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-8">
                <div>
                  <h2 className="text-xl text-gray-700 mb-4 font-funnel-display">Plaintext</h2>
                  <textarea
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    className="font-funnel-display w-full h-[200px] p-4 border border-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter your text here..."
                  />
                </div>
                <div>
                  <div className="w-full h-[280px] flex items-center justify-center">
                    <img
                      src="/assets/images/blocklock.gif"
                      alt="Encryption animation"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Decryption Time Section and Encrypt Button - Stack on mobile, side by side on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <h2 className="text-xl text-gray-700 mb-4 font-funnel-display">Decryption Time</h2>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={decryptionTime}
                      onChange={(e) => setDecryptionTime(e.target.value)}
                      className="font-funnel-display w-full px-4 py-2 border border-gray-300 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </div>

                <div className="flex items-end font-funnel-display">
                  <button
                    onClick={handleEncrypt}
                    disabled={!userMessage || !decryptionTime}
                    className={`font-funnel-display w-full h-11 text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${(!userMessage || !decryptionTime) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Encrypt
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 p-4 sm:p-8 h-[520px] flex flex-col">
              {/* Explorer Section */}
              <div className='flex justify-between'>
                <h2 className="text-xl text-gray-800 mb-6 font-funnel-display">Message Explorer</h2>
                <button onClick={fetchRequest} >
                  <Image
                    className={`${loading ? "animate-spin" : ""} cursor-pointer mb-6`}
                    src="/assets/images/refresh.svg"
                    width={15}
                    height={15}
                    alt="Randamu Logo"
                  />
                </button>
              </div>



              {requests.length > 0 ? (
                <div className="overflow-y-auto flex-1">
                  <div className="grid gap-6">
                    {requests.map((message) => (
                      <div key={message.id} className="border border-gray-200 shadow-sm p-6 bg-gray-50">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-sm font-funnel-display">Request ID</span>
                            <span className="text-gray-900 font-medium font-funnel-display">{message.id}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-sm font-funnel-display">Encryption Block Number</span>
                            <span className="text-gray-900 font-medium font-funnel-display">{message.encryptedAt}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-sm font-funnel-display">Decryption Block Number</span>
                            <span className="text-gray-900 font-medium font-funnel-display">{message.decryptedAt}</span>
                          </div>
                        </div>
                        {
                          message.message != "" && <>
                            <div className="mt-2">
                              <span className="text-gray-500 text-sm font-funnel-display">Decrypted Message</span>
                              <div className="border border-gray-200 p-3 mt-1 bg-white overflow-x-auto">
                                <code className="text-sm text-gray-800 font-funnel-display">
                                  {message.message}
                                </code>
                              </div>
                            </div></>
                        }

                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-funnel-display">No encrypted messages found. Create one in the Encrypt tab.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ) : <Wallet />
  );
};

export default BlockLockPage;