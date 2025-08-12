'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    baseSepolia
} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import { http } from 'wagmi';

const queryClient = new QueryClient();

// Debug environment variables
console.log('Environment check:');
console.log('NEXT_PUBLIC_ALCHEMY_KEY present:', !!process.env.NEXT_PUBLIC_ALCHEMY_KEY);
console.log('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID present:', !!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID);

const alchemyUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`;
console.log('Wagmi using Alchemy URL:', alchemyUrl.replace(process.env.NEXT_PUBLIC_ALCHEMY_KEY || '', 'xxx...xxx'));

const config = getDefaultConfig({
    appName: 'Randamu',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
    chains: [baseSepolia],
    ssr: true,
    transports: {
        [baseSepolia.id]: process.env.NEXT_PUBLIC_ALCHEMY_KEY 
            ? http(alchemyUrl)
            : http('https://sepolia.base.org') // Fallback to public RPC
    }
});

export default function ContextProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider showRecentTransactions={true}>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}