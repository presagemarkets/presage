/**
 * Stocks allowed for markets and swaps: their USDG pools passed the TWAP survey
 * of 2026-08-26 (observation buffer >= 1400 slots; the contract enforces a
 * minimum of 100). Addresses and fee tiers come from HoodStock's verified
 * catalog (hoodstock-app/src/{stocks,pools}.ts) — all checked on-chain there.
 * Pools outside this list are rejected by the contract ("thin history").
 */
export interface Stock {
  symbol: string;
  /** The stock token itself (18 decimals) — swap quoter/router input. */
  token: `0x${string}`;
  /** Deepest stock/USDG Uniswap v3 pool — price reads + TWAP resolution. */
  pool: `0x${string}`;
  /** Fee tier of that pool (uint24), needed to route swaps through it. */
  fee: number;
}

export const STOCKS: Stock[] = [
  { symbol: "NVDA", token: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", pool: "0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3", fee: 500 },
  { symbol: "SPCX", token: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", pool: "0xEb07d9587eFD1778dFb9c385Ec43EF6d5F9fE401", fee: 3000 },
  { symbol: "USO", token: "0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344", pool: "0x02175608F1b5E6b5ed221cCFdC7Be197D111D915", fee: 3000 },
  { symbol: "SLV", token: "0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f", pool: "0x0Fa7BC480885DCf58Ad2ef63eC7289cF2481D51c", fee: 10000 },
  { symbol: "GME", token: "0x1b0E319c6A659F002271B69dB8A7df2F911c153E", pool: "0xE9713f453aDB9245B19559790c96F470a18F2fDF", fee: 10000 },
  { symbol: "SPY", token: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", pool: "0xA43b424Bc609495AED4BCD88d654934b510B0aD9", fee: 3000 },
  { symbol: "QQQ", token: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", pool: "0xEbD78dcfc8a6b3A696f1E191aD1ff321f9579f79", fee: 3000 },
  { symbol: "TSLA", token: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", pool: "0xf4ACdAEEB7022862A763C9B1B885e11191c889E3", fee: 3000 },
  { symbol: "COST", token: "0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2", pool: "0x0a2121A50A09eD0796ae81F9c53fF9398355a398", fee: 3000 },
  { symbol: "AAPL", token: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", pool: "0x783C9bbB765047CFdD2b84b92b2Ca9F11D34b7Ed", fee: 3000 },
  { symbol: "NFLX", token: "0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8", pool: "0xeA75eA625d83aE276b9ae8B0A3dC205916EE65cF", fee: 10000 },
  { symbol: "TSM", token: "0x58FfE4a942d3885bAa22D7520691F611EF09e7AA", pool: "0x07e8Ea83D4C1340774c8965125e26e12bf943bf1", fee: 10000 },
  { symbol: "ASML", token: "0x47F93d52cBeC7C6D2CfC080e154002370a60dAEA", pool: "0xedb22516B14Eb2d1C86927Db373B0E8bF70F5cD1", fee: 10000 },
  { symbol: "PLTR", token: "0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A", pool: "0x851680416A4f4E1c463d45171d61ACDdBc8554c0", fee: 3000 },
  { symbol: "INTC", token: "0xc72b96e0E48ecd4DC75E1e45396e26300BC39681", pool: "0x2e5a92f5013a64661A49312111be2e8aBd33F56a", fee: 3000 },
  { symbol: "MSFT", token: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", pool: "0xeb60bCD1D920ad6E102690CCFC6fB488899E1510", fee: 3000 },
  { symbol: "SNDK", token: "0xB90A19fF0Af67f7779afF50A882A9CfF42446400", pool: "0xA1e1C9519cD5ae47e9A935645E1A7b935b944559", fee: 10000 },
  { symbol: "MU", token: "0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD", pool: "0xd057B1Bc54917855BBee58eAd58647f47caB35E5", fee: 3000 },
  { symbol: "DELL", token: "0x941AE714EC6D8130c7B75d67160Ca08f1e7d11Dd", pool: "0xc30c89cB7815A1488b7998D15eEC73961707Fc5a", fee: 10000 },
  { symbol: "SGOV", token: "0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5", pool: "0xfAb520051f96F4D2a32c22B6a3dD7fFfdf231bFe", fee: 3000 },
  { symbol: "GOOGL", token: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", pool: "0x553e9a453425CD9B90919F317061FbC3794CC57a", fee: 3000 },
  { symbol: "MSTR", token: "0xec262a75e413fAfD0dF80480274532C79D42da09", pool: "0x17578C0e0D15da44f31677263114F71aE76653EA", fee: 10000 },
  { symbol: "AMZN", token: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", pool: "0x8AC92DA74AB5F3b1d024Dc1943Ad7e15Dc4179Ef", fee: 3000 },
  { symbol: "QUBT", token: "0x59818904ab4cE163b3cE4FfB64f2D6Ca02c434B4", pool: "0x2E2a857C08aD6C09f1d1EC4FDB4Cc7cd06cF17f4", fee: 10000 },
  { symbol: "RDDT", token: "0x05b37Fb53A299a1b874A619e1c4C404D52C36F4C", pool: "0xa8744E76aED23B05F0126335E7BD38f7935D19fe", fee: 10000 },
  { symbol: "AMD", token: "0x86923f96303D656E4aa86D9d42D1e57ad2023fdC", pool: "0xD6aF1dcB75cdAE4F2efc403A58eF023A51edC686", fee: 10000 },
  { symbol: "RBLX", token: "0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8", pool: "0x2ef5945cd5664876b6481FdacFaA2942995a4DA8", fee: 10000 },
  { symbol: "NU", token: "0x408c14038a04f7bD235329E26d2bf569ee20e250", pool: "0xb6d047637151f6De1d02028acdd187Aa9cb7AFE3", fee: 10000 },
  { symbol: "MRVL", token: "0x62fd0668e10D8B72339BE2DCF7643001688ff13B", pool: "0x06cc0b96Be1fa1d754CE2e1228F5d8c616F795b0", fee: 10000 },
  { symbol: "BA", token: "0x4D21483a44Bf67a86b77E3dA301411880797D452", pool: "0xbf3904cAd0E63a4796CF806C21f2C1528B8eBE06", fee: 10000 },
  { symbol: "LLY", token: "0x8005d266423c7ea827372c9c864491e5786600ea", pool: "0xF4274130137eeE20bAD928B593d992716516CEB9", fee: 10000 },
  { symbol: "UPS", token: "0xf23250dac154D05Bb671CB0d0eBEf3c635c79CE2", pool: "0x3Ab74C45DceCC6A62898204Dd42143a816B44CB1", fee: 10000 },
  { symbol: "F", token: "0x25C288E6D899b9BC30160965aD9644c67e73bE0C", pool: "0x01948e834623aA859ffDC0D299dD15e7C9D7486F", fee: 10000 },
  { symbol: "CCL", token: "0x9651342CeA770aE9a2969Ba2A52611523146aef9", pool: "0xB19AcE635Ef3A28B85bFB01Bae97d0DE80750680", fee: 10000 },
];
