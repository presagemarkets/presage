/** ProfileRegistry — public on-chain display names (and avatar URLs). */

export const PROFILE_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ADDRESS ?? "") as `0x${string}`;

export const profileRegistryAbi = [
  {
    type: "function",
    name: "setProfile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "avatar", type: "string" },
    ],
    outputs: [],
  },
  { type: "function", name: "clearProfile", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "getProfile",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "avatar", type: "string" },
    ],
  },
] as const;
