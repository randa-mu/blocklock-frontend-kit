'use client';
import React from 'react';
import { useState, useEffect } from 'react';
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
  const [errors, setErrors] = useState<{
    message?: string;
    time?: string;
    funds?: string;
  }>({});

  const { data: walletClient } = useWalletClient();

  // Auto-fetch messages when decrypt tab is active and wallet is connected
  useEffect(() => {
    if (activeTab === 'decrypt' && isConnected && walletClient) {
      fetchRequest();
    }
  }, [activeTab, isConnected, walletClient]);

  // Validation function
  const validateInputs = () => {
    const newErrors: typeof errors = {};

    // Message validation
    if (!userMessage.trim()) {
      newErrors.message = 'Please enter a message';
    } else if (userMessage.length > 280) {
      newErrors.message = `Message is too long (${userMessage.length}/280 characters)`;
    }

    // Time validation
    if (!decryptionTime) {
      newErrors.time = 'Please select an unlock time';
    } else {
      const selectedTime = new Date(decryptionTime);
      const now = new Date();
      if (selectedTime <= now) {
        newErrors.time = 'Unlock time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEncrypt = async () => {
    // Clear previous errors
    setErrors({});

    // Validate inputs
    if (!validateInputs()) {
      return;
    }

    if (!walletClient) {
      setErrors({ funds: 'Please connect your wallet first' });
      return;
    }

    // Check if Alchemy API key is configured
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
    console.log('=== ALCHEMY KEY DEBUG ===');
    console.log('Raw env var:', process.env.NEXT_PUBLIC_ALCHEMY_KEY);
    console.log('Alchemy Key present:', !!alchemyKey);
    console.log('Alchemy Key length:', alchemyKey?.length || 0);
    console.log('Alchemy Key full (masked):', alchemyKey?.replace(/./g, '*'));
    console.log('Alchemy Key first 10 chars:', alchemyKey?.substring(0, 10));
    console.log('Alchemy Key last 5 chars:', alchemyKey?.substring((alchemyKey?.length || 0) - 5));
    console.log('Has newlines?', alchemyKey?.includes('\n'));
    console.log('Has carriage returns?', alchemyKey?.includes('\r'));
    console.log('Has spaces?', alchemyKey?.includes(' '));
    console.log('=========================');
    
    if (!alchemyKey) {
      alert('Alchemy API key is not configured. Please add NEXT_PUBLIC_ALCHEMY_KEY to your environment variables.');
      return;
    }
    
    // Clean the key of any whitespace
    const cleanKey = alchemyKey.trim();
    console.log('Cleaned key length:', cleanKey.length);
    
    if (cleanKey.includes('your_alchemy_api_key_here') || cleanKey.length < 10) {
      alert(`Please replace the placeholder API key with your actual Alchemy API key.`);
      return;
    }
    
    console.log('API key validation passed, proceeding with encryption...');

    try {
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      console.log('Signer:', signer);
      
      // Use the wallet provider for blockchain calls instead of separate JSON provider
      console.log('Getting current block from wallet provider...');
      const currentBlock = await provider.getBlockNumber();
      console.log('Current block from wallet provider:', currentBlock);
      
      const currentBlockData = await provider.getBlock(currentBlock);
      console.log('Current block data:', currentBlockData);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
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

      // Create a separate JSON provider for Blocklock.js
      const alchemyUrl = `https://base-sepolia.g.alchemy.com/v2/${cleanKey}`;
      console.log('Using Alchemy URL:', alchemyUrl.replace(cleanKey, 'xxx...xxx'));
      const jsonProvider = new ethers.JsonRpcProvider(alchemyUrl);
      
      // Encrypt the encoded message using Blocklock.js library
      console.log('Creating Blocklock instance...');
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
        
        // Provide user-friendly error messages
        if (error.message.includes('insufficient funds')) {
          setErrors({ 
            funds: 'Insufficient funds! You need approximately 0.1 ETH in Base Sepolia testnet to complete this transaction.' 
          });
        } else if (error.message.includes('user rejected')) {
          setErrors({ funds: 'Transaction was cancelled by user.' });
        } else if (error.message.includes('network')) {
          setErrors({ funds: 'Network error. Please check your connection and try again.' });
        } else {
          setErrors({ funds: `Transaction failed: ${error.message}` });
        }
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

      // Sort messages by ID in descending order (latest first)
      temp.sort((a, b) => b.id - a.id);
      setRequests(temp);
    } catch (err) {
      console.error("Error fetching request:", err);
    }
    setLoading(false);

  }

  return (
    isConnected ? (
      <div className="bg-white-pattern min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8 font-sans min-h-[calc(100vh-80px)]">
          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 rounded-xl p-1 inline-flex">
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'text' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('text')}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Create Message</span>
                </div>
              </button>
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'decrypt' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => fetchRequest()}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>View Messages</span>
                </div>
              </button>
            </div>
          </div>
          {activeTab === 'text' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {/* Header Section */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-3 font-funnel-display">
                  Blocklock Encryption
                </h1>
                <p className="text-lg text-gray-600 mb-2 font-funnel-sans max-w-2xl mx-auto">
                  Create a message that automatically unlocks at a future time using threshold cryptography.
                </p>
                <a 
                  href="https://docs.dcipher.network/features/conditional-encryption" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors mb-4"
                >
                  Learn more about how it works
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                
                {/* Requirements Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4  mx-auto">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-blue-600 mb-2">Requirements for Demo</h3>
                      <ul className="text-sm text-blue-600 space-y-1">
                        <li>• Connect wallet to <strong>Base Sepolia</strong> testnet</li>
                        <li>• Need ~0.1 ETH for transaction costs</li>
                        <li>• Get free testnet ETH from faucets below</li>
                      </ul>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a 
                          href="https://www.coinbase.com/developer-platform/products/faucet" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Base Faucet
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <a 
                          href="https://sepoliafaucet.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-white border border-blue-600 text-blue-600 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          Sepolia Faucet
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 font-funnel-display mb-2">Message</h2>
                  <p className="text-gray-600 font-funnel-sans mb-4">Enter the text you want to encrypt.</p>
                  <div>
                    <textarea
                      value={userMessage}
                      onChange={(e) => {
                        setUserMessage(e.target.value);
                        if (errors.message) {
                          setErrors({ ...errors, message: undefined });
                        }
                      }}
                      className={`font-funnel-sans text-gray-900 w-full h-[160px] p-4 border-2 rounded-xl resize-none focus:outline-none focus:ring-0 transition-all duration-200 placeholder-gray-400 ${
                        errors.message 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
                      placeholder="Type your message here..."
                      maxLength={280}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        {errors.message && (
                          <p className="text-sm text-red-600 font-funnel-sans flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.message}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-funnel-sans">
                        {userMessage.length}/280
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-funnel-sans mt-1 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    This is a public demo. Your message will be visible after it unlocks.
                  </p>
                </div>

                {/* Unlock Time Section */}
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 font-funnel-display mb-2">Lock until</h2>
                  <p className="text-gray-600 font-funnel-sans mb-6">Choose a time when your message should automatically unlock, this will be mapped to a future block on-chain.</p>
                  
                  {/* Date/Time Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-3 font-funnel-sans">
                      Select date & time
                      <span className="text-gray-500 font-normal ml-2">
                        ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={decryptionTime}
                      onChange={(e) => {
                        setDecryptionTime(e.target.value);
                        if (errors.time) {
                          setErrors({ ...errors, time: undefined });
                        }
                      }}
                      className={`font-funnel-sans w-full px-4 py-3 border-2 text-gray-900 rounded-xl focus:outline-none focus:ring-0 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                        errors.time 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
                      min={(() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                      })()}
                      style={{ colorScheme: 'light' }}
                    />
                    {errors.time && (
                      <p className="text-sm text-red-600 font-funnel-sans flex items-center gap-1 mt-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.time}
                      </p>
                    )}
                  </div>
                  
                  {/* Quick time chips */}
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: '+1 min', minutes: 1 },
                        { label: '+5 min', minutes: 5 },
                        { label: '+1 hour', minutes: 60 },
                        { label: 'Tomorrow', minutes: 1440 }
                      ].map((option) => {
                        const getExpectedTime = () => {
                          const now = new Date();
                          return new Date(now.getTime() + option.minutes * 60000);
                        };
                        
                        const isSelected = (() => {
                          if (!decryptionTime) return false;
                          const selectedTime = new Date(decryptionTime);
                          const expectedTime = getExpectedTime();
                          return Math.abs(selectedTime.getTime() - expectedTime.getTime()) < 120000; // Within 2 minutes
                        })();
                        
                        return (
                          <button
                            key={option.label}
                            onClick={() => {
                              const newTime = getExpectedTime();
                              const year = newTime.getFullYear();
                              const month = String(newTime.getMonth() + 1).padStart(2, '0');
                              const day = String(newTime.getDate()).padStart(2, '0');
                              const hours = String(newTime.getHours()).padStart(2, '0');
                              const minutes = String(newTime.getMinutes()).padStart(2, '0');
                              const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                              setDecryptionTime(localTimeString);
                            }}
                            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-500 text-white border-2 border-blue-500 shadow-sm'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Unlock time display */}
                  {decryptionTime && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-blue-900 font-funnel-sans">
                            Unlocks in {(() => {
                              const now = new Date();
                              const unlockTime = new Date(decryptionTime);
                              const diffMs = unlockTime.getTime() - now.getTime();
                              const diffMins = Math.ceil(diffMs / (1000 * 60));
                              
                              if (diffMins < 1) return 'less than 1 minute';
                              if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
                              const hours = Math.floor(diffMins / 60);
                              const mins = diffMins % 60;
                              if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
                              return `${hours}h ${mins}m`;
                            })()}
                          </p>
                          <p className="text-xs text-blue-700 font-funnel-sans mt-1">
                            Estimated block: ~{(() => {
                              const now = new Date();
                              const unlockTime = new Date(decryptionTime);
                              const diffMs = unlockTime.getTime() - now.getTime();
                              const diffSeconds = Math.ceil(diffMs / 1000);
                              const blocksToAdd = Math.ceil(diffSeconds / 12); // ~12 seconds per block
                              return (29269740 + blocksToAdd).toLocaleString();
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Network info */}
                  <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 font-funnel-sans">Base Sepolia Testnet</p>
                        <p className="text-xs text-gray-600 font-funnel-sans">Blockchain network for testing</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Encrypt Button */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                {errors.funds && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-red-800 mb-1">Transaction Error</h4>
                        <p className="text-sm text-red-700">{errors.funds}</p>
                        {errors.funds.includes('Insufficient funds') && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <a 
                              href="https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors"
                            >
                              Get Base ETH
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleEncrypt}
                  disabled={loading || !userMessage.trim() || !decryptionTime}
                  className={`w-full py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-200 ${
                    loading || !userMessage.trim() || !decryptionTime
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {loading 
                    ? 'Encrypting...' 
                    : !userMessage.trim() || !decryptionTime 
                    ? 'Enter message and time to encrypt' 
                    : 'Encrypt Message'
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {/* Header Section */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-3 font-funnel-display">
                  Message Explorer
                </h1>
                <p className="text-lg text-gray-600 mb-4 font-funnel-sans max-w-2xl mx-auto">
                  Watch your blocklocked messages automatically decrypt when their scheduled time arrives.
                </p>
                <div className="flex flex-col items-center justify-center gap-4">
                  <a 
                    href="https://docs.dcipher.network" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                  >
                    Learn about threshold cryptography
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <button 
                    onClick={fetchRequest}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-blue-600 font-medium transition-colors"
                  >
                    <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {requests.length > 0 ? (
                <div className="space-y-6">
                  {requests.map((message) => (
                    <div key={message.id}>
                      {/* Message Content */}
                      {message.message ? (
                        <div className="relative rounded-xl border border-emerald-500 bg-white shadow-sm p-6">
                          {/* ID Pill */}
                          <div className="absolute top-4 right-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-500 border border-emerald-500">#{message.id}</span>
                          </div>

                          {/* Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <h4 className="text-sm font-semibold text-emerald-500 font-funnel-sans">Unlocked</h4>
                          </div>

                          {/* Message */}
                          <p className="text-gray-900 font-funnel-sans mb-5">"{message.message}"</p>

                          {/* Block Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-1 gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-funnel-sans">Encrypted at block:</span>
                              <p className="font-funnel-sans text-gray-800">#{Number(message.encryptedAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 font-funnel-sans">Decrypted at block:</span>
                              <p className="font-funnel-sans text-gray-800">#{Number(message.decryptedAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-xl border border-white bg-amber-500 p-6 overflow-hidden shadow-sm">
                          {/* Subtle pixel background */}
                          <div className="absolute inset-0 opacity-20">
                            {[
                              { x: 12, y: 18, d: 3.2, dl: 0.4 }, { x: 28, y: 12, d: 3.8, dl: 0.8 }, { x: 46, y: 22, d: 3.1, dl: 1.1 },
                              { x: 64, y: 15, d: 3.9, dl: 0.6 }, { x: 82, y: 20, d: 3.0, dl: 1.7 }, { x: 20, y: 38, d: 3.6, dl: 1.3 },
                              { x: 38, y: 34, d: 3.4, dl: 0.2 }, { x: 57, y: 37, d: 3.5, dl: 1.9 }, { x: 76, y: 33, d: 3.2, dl: 0.9 },
                              { x: 90, y: 28, d: 3.7, dl: 1.4 }, { x: 14, y: 56, d: 3.3, dl: 0.5 }, { x: 32, y: 52, d: 3.8, dl: 1.6 },
                              { x: 49, y: 58, d: 3.2, dl: 1.0 }, { x: 67, y: 54, d: 3.7, dl: 0.7 }, { x: 84, y: 57, d: 3.1, dl: 1.8 }
                            ].map((p, i) => (
                              <div
                                key={i}
                                className="absolute w-2 h-2 bg-white/60"
                                style={{ left: `${p.x}%`, top: `${p.y}%`, animation: `pixelBlink ${p.d}s ease-in-out infinite`, animationDelay: `${p.dl}s` }}
                              />
                            ))}
                          </div>

                          {/* ID Pill */}
                          <div className="absolute top-4 right-4 z-10">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-amber-50 border border-white/20 ">#{message.id}</span>
                          </div>

                          {/* Header */}
                          <div className="relative z-10 flex items-center gap-2 mb-3">
                            <span className="inline-block w-2 h-2 bg-amber-50 rounded-full animate-pulse"></span>
                            <h4 className="text-sm font-semibold text-amber-50 font-funnel-sans">Locked</h4>
                          </div>

                          {/* Description */}
                          <p className="relative z-10 text-sm text-white/90 font-funnel-sans mb-5">
                            This message will automatically unlock when block <span className="text-white font-semibold">#{Number(message.decryptedAt).toLocaleString()}</span> is reached
                          </p>

                          {/* Block Details */}
                          <div className="relative z-10 grid grid-cols-1 gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-white/80 font-funnel-sans">Encrypted at block:</span>
                              <p className="font-funnel-sans text-white">#{Number(message.encryptedAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 font-funnel-display">
                    No Messages Yet
                  </h3>
                  <p className="text-gray-600 mb-6 font-funnel-sans max-w-md mx-auto">
                    Create your first block-locked message to see how threshold cryptography works in action.
                  </p>
                  <button
                    onClick={() => setActiveTab('text')}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Your First Message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ) : (
      <Wallet />
    )
  );
};

export default BlockLockPage;