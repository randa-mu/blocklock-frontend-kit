import { ethers, getBytes, id } from "ethers";
import {
  Blocklock,
  encodeCiphertextToSolidity,
  encodeCondition,
} from "blocklock-js";
import { useMutation } from "@tanstack/react-query";
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthers";
import { useState } from "react";
import { useAccount } from "wagmi";
import { CONTRACT_ABI } from "@/lib/contract";
import { useNetworkConfig } from "./useNetworkConfig";

export const useEncrypt = () => {
  const [activeTab, setActiveTab] = useState("text");
  const [userMessage, setUserMessage] = useState("");
  const [decryptionTime, setDecryptionTime] = useState("");
  const signer = useEthersSigner();
  const provider = useEthersProvider();
  const { chainId } = useAccount();
  const { CONTRACT_ADDRESS, secondsPerBlock, gasConfig } = useNetworkConfig();
  const handleEncrypt = useMutation({
    mutationFn: async ({
      userMessage,
      decryptionTime,
    }: {
      userMessage: string;
      decryptionTime: string;
    }) => {
      if (!signer || !provider || !chainId) {
        throw new Error("Please connect your wallet");
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Calculate target block height based on decryption time
      const currentBlock = await provider.getBlockNumber();
      const currentBlockData = await provider.getBlock(currentBlock);
      const currentTimestamp =
        currentBlockData?.timestamp || Math.floor(Date.now() / 1000);

      const targetTimestamp = Math.floor(
        new Date(decryptionTime).getTime() / 1000
      );
      const blocksToAdd = Math.ceil(
        (targetTimestamp - currentTimestamp) / secondsPerBlock
      );

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
      setDecryptionTime(""); // Clear the time input
    },
  });

  return {
    handleEncrypt,
    setActiveTab,
    setUserMessage,
    setDecryptionTime,
    activeTab,
    userMessage,
    decryptionTime,
  };
};
