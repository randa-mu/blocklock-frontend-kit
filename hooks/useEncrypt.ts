import { ethers, getBytes, id } from "ethers";
import {
  Blocklock,
  encodeCiphertextToSolidity,
  encodeCondition,
} from "blocklock-js";
import { useMutation } from "@tanstack/react-query";
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CONTRACT_ABI } from "@/lib/contract";
import { useNetworkConfig } from "./useNetworkConfig";

export const useEncrypt = () => {
  const [activeTab, setActiveTab] = useState("text");
  const [userMessage, setUserMessage] = useState("");
  const [blocksAhead, setBlocksAhead] = useState("");
  const [estimatedDecryptionTime, setEstimatedDecryptionTime] = useState("");
  const signer = useEthersSigner();
  const provider = useEthersProvider();
  const { chainId } = useAccount();
  const { CONTRACT_ADDRESS, secondsPerBlock, gasConfig } = useNetworkConfig();

  useEffect(() => {
    const updateEstimate = async () => {
      try {
        if (!provider || !secondsPerBlock || !blocksAhead) {
          setEstimatedDecryptionTime("");
          return;
        }
        const currentBlock = await provider.getBlockNumber();
        const currentBlockData = await provider.getBlock(currentBlock);
        const currentTimestamp =
          currentBlockData?.timestamp || Math.floor(Date.now() / 1000);

        const blocks = Number(blocksAhead);
        if (Number.isNaN(blocks) || blocks <= 0) {
          setEstimatedDecryptionTime("");
          return;
        }

        const targetTimestamp = currentTimestamp + blocks * secondsPerBlock;
        const diffSeconds = Math.max(0, targetTimestamp - currentTimestamp);

        const days = Math.floor(diffSeconds / 86400);
        const hours = Math.floor((diffSeconds % 86400) / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = Math.floor(diffSeconds % 60);

        const parts: string[] = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (seconds || parts.length === 0) parts.push(`${seconds}s`);

        const absolute = new Date(targetTimestamp * 1000).toLocaleString();
        setEstimatedDecryptionTime(`in ~${parts.join(" ")} (≈ ${absolute})`);
      } catch {
        setEstimatedDecryptionTime("");
      }
    };

    updateEstimate();
  }, [provider, secondsPerBlock, blocksAhead]);
  const handleEncrypt = useMutation({
    mutationFn: async ({
      userMessage,
      blocksAhead,
    }: {
      userMessage: string;
      blocksAhead: string;
    }) => {
      if (!signer || !provider || !chainId) {
        throw new Error("Please connect your wallet");
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Calculate target block height based on blocks ahead
      const currentBlock = await provider.getBlockNumber();

      const blocksToAdd = Number(blocksAhead);
      if (Number.isNaN(blocksToAdd) || blocksToAdd <= 0) {
        throw new Error("Please enter a valid number of blocks ahead");
      }

      const blockHeight = BigInt(currentBlock + blocksToAdd);
      console.log(
        `Current block: ${currentBlock}, Target block: ${blockHeight.toString()}`
      );

      // Set the message to encrypt
      const msgBytes = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [userMessage]
      );
      const encodedMessage = getBytes(msgBytes);
      console.log("Encoded message:", encodedMessage);

      // Encrypt the encoded message usng Blocklock.js library
      const blocklockjs = Blocklock.createFromChainId(signer, chainId);
      const cipherMessage = blocklockjs.encrypt(encodedMessage, blockHeight);
      console.log("Ciphertext:", cipherMessage);

      const callbackGasLimit = gasConfig.callbackGasLimitDefault;
      const [requestCallBackPrice] =
        await blocklockjs.calculateRequestPriceNative(BigInt(callbackGasLimit));
      console.log(
        "Request CallBack price:",
        ethers.formatEther(requestCallBackPrice),
        "ETH"
      );
      const conditionBytes = encodeCondition(blockHeight);

      const tx = await contract.createTimelockRequestWithDirectFunding(
        callbackGasLimit,
        currentBlock,
        blockHeight,
        conditionBytes,
        encodeCiphertextToSolidity(cipherMessage),
        { value: requestCallBackPrice }
      );

      await tx.wait(2);

      console.log("Transaction sent:", tx);

      console.log("Request ID:", id);
      console.log("Ciphertext:", cipherMessage);
      setActiveTab("decrypt");
      setUserMessage(""); // Clear the input
      setBlocksAhead(""); // Clear the blocks input
      setEstimatedDecryptionTime("");
    },
  });

  return {
    handleEncrypt,
    setActiveTab,
    setUserMessage,
    setBlocksAhead,
    activeTab,
    userMessage,
    blocksAhead,
    estimatedDecryptionTime,
  };
};
