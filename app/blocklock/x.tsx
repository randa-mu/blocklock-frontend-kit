'use client';
import React from 'react';
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import Header from './header';
import Wallet from '../wallet';

const BlockLockPage = () => {
  const { data: readData, refetch: refetchReadData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'randomNumber',
  }) as { data: bigint | undefined, refetch: () => void };

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('text');
  const [plaintext, setPlaintext] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [decryptionTime, setDecryptionTime] = useState('');

  const handleEncrypt = () => {
    if (!plaintext || !decryptionTime) {
      alert('Please enter both text and decryption time');
      return;
    }
    const encrypted = Buffer.from(plaintext).toString('base64');
    setCiphertext(encrypted);
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Text Areas Section */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl text-gray-700 mb-4">Plaintext</h2>
                <textarea
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  className="w-full h-[400px] p-4 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your text here..."
                />
              </div>
              <div>
                <h2 className="text-xl text-gray-700 mb-4">Ciphertext</h2>
                <textarea
                  value={ciphertext}
                  readOnly
                  className="w-full h-[400px] p-4 border border-gray-300 rounded-md resize-none bg-gray-50"
                  placeholder="Encrypted text will appear here..."
                />
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
          <div className="flex justify-end mb-6">
            <div className="flex gap-0">
              <button
                className={`w-[200px] py-3 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${
                  activeTab === 'text' ? 'border-gray-400' : ''
                }`}
                onClick={() => setActiveTab('text')}
              >
                drand
              </button>
              <button
                className={`w-[200px] py-3 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${
                  activeTab === 'vulnerability' ? 'border-gray-400' : ''
                }`}
                onClick={() => setActiveTab('vulnerability')}
              >
                dcipher
              </button>
              <button
                className={`w-[200px] py-3 font-funnel-sans text-gray-900 border border-gray-200 hover:border-gray-400 transition-colors text-center ${
                  activeTab === 'decrypt' ? 'border-gray-400' : ''
                }`}
                onClick={() => setActiveTab('decrypt')}
              >
                timelock
              </button>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>
    ) : <Wallet />
  );
};

export default BlockLockPage;
