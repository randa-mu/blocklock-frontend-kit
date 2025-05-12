'use client';
import React from 'react';
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import Header from './header';
import Wallet from '../wallet';
import { ethers, getBytes, parseEther } from "ethers";
import { Blocklock, SolidityEncoder, encodeCiphertextToSolidity, encodeCondition } from "blocklock-js";
import {
  ZeroAddress,
  isHexString,
  toUtf8Bytes,
  AbiCoder,
  Signer,
  EthersError,
  EventFragment,
  Interface,
  Result,
  TransactionReceipt,
  Provider,
} from "ethers";

const BlockLockPage = () => {

  const { data: readData, refetch: refetchReadData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'plainTextValue',
  }) as { data: string | undefined, refetch: () => void };

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('text');
  const [plaintext, setPlaintext] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [decryptionTime, setDecryptionTime] = useState('');

  const { data: walletClient } = useWalletClient();

  const handleEncrypt = async () => {
    if (!plaintext || !decryptionTime) {
      alert('Please enter both text and decryption time');
      return;
    }

    if (!walletClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();

      // WORKING - TS - DO NOT TOUCH

      // const blocklock = Blocklock.createBaseSepolia(signer)
      // const plaintext = Buffer.from("hello world!")
      // const targetBlock = BigInt(25592255)
      // console.log(`before encrypt: ${targetBlock} and target: ${targetBlock}`)
      // const { id } = await blocklock.encryptAndRegister(plaintext, targetBlock)
      // console.log("after encrypt")

      // WIP - CONTRACT INTEGRATION

      const targetBlock = BigInt(26592255)
      const conditionBytes = encodeCondition(targetBlock);
      console.log(BigInt("84532"))
      const blocklockjs = new Blocklock(signer, "0x82Fed730CbdeC5A2D8724F2e3b316a70A565e27e", BigInt("84532"));
      const encoder = new SolidityEncoder();
      const msgBytes = encoder.encodeString("THE MESSAGE TO BE ENCRYPTED");
      const encodedMessage = getBytes(msgBytes);

      const ciphertext = blocklockjs.encrypt(encodedMessage, targetBlock);
      console.log(CONTRACT_ADDRESS)

      const callbackGasLimit = 500_000;
      try {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'createTimelockRequestWithDirectFunding',
          args: [
            callbackGasLimit, conditionBytes, encodeCiphertextToSolidity(ciphertext)
          ],
        });
        console.log("click")
      } catch (error) {
        console.error('Transfer failed:', error);
      }

    } catch (error) {
      console.error('Contract write failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'text':
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            {/* Decryption Time Section */}
            <div className="mb-8">
              <h2 className="text-xl text-gray-700 mb-4">Decryption Time</h2>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={decryptionTime}
                  onChange={(e) => setDecryptionTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Encrypt Button */}
            <div className="flex justify-end">
              <button
                onClick={handleEncrypt}
                disabled={!plaintext || !decryptionTime}
                className={`w-[200px] py-3 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${(!plaintext || !decryptionTime) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                Encrypt
              </button>
            </div>

            {/* Text Areas Section */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl text-gray-700 mb-4">Plaintext</h2>
                <textarea
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  className="w-full h-[400px] p-4 border border-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your text here..."
                />
              </div>
              <div>
                <h2 className="text-xl text-gray-700 mb-4">Ciphertext</h2>
                <div className="w-full h-[200px] border border-gray-300 bg-gray-50 flex items-center justify-center relative">
                  <div className="w-full h-[280px] flex items-center justify-center">
                    <img
                      src="/assets/images/blocklock.gif"
                      alt="Encryption animation"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'vulnerability':
        return <div className="bg-white border border-gray-200 rounded-lg p-8">Vulnerability Report Content</div>;
      case 'decrypt':
        return <div className="bg-white border border-gray-200 rounded-lg p-8">Decrypt Content</div>;
      default:
        return null;
    }
  };

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
                onClick={() => setActiveTab('decrypt')}
              >
                Decrypt
              </button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-4 sm:p-8">
            {/* Text Areas Section - Stack on mobile, side by side on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-8">
              <div>
                <h2 className="text-xl text-gray-700 mb-4">Plaintext</h2>
                <textarea
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  className="w-full h-[200px] p-4 border border-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <h2 className="text-xl text-gray-700 mb-4">Decryption Time</h2>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={decryptionTime}
                    onChange={(e) => setDecryptionTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleEncrypt}
                  disabled={!plaintext || !decryptionTime}
                  className={`w-full h-11 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${(!plaintext || !decryptionTime) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Encrypt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : <Wallet />
  );
};

export default BlockLockPage;
