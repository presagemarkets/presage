# Create daily rounds (AAPL/NVDA/TSLA/SPY) + weekly duel via cast — a manual
# stand-in for /api/rounds while RESOLVER_KEY is not yet set in hoodbet\.env.
# Run: powershell -File rounds.ps1

$ErrorActionPreference = "Stop"
$cast = "$env:USERPROFILE\.foundry\bin\cast.exe"
$rpc  = "https://robinhood-rpc.publicnode.com"
$pk   = (Get-Content "$env:USERPROFILE\hoodnft\.env" | Select-String "^DEPLOYER_KEY=").ToString().Split("=")[1]
$twap = (Get-Content "$env:USERPROFILE\hoodbet\.env" | Select-String "^NEXT_PUBLIC_TWAP_RESOLVER_ADDRESS=").ToString().Split("=")[1]

$dateTag  = (Get-Date).ToUniversalTime().ToString("MMM d")
$now      = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$close    = $now + 19800   # 5.5 hours
$resolveT = $close + 3600  # contract lock gap

$pools = @{
  "AAPL" = "0x783C9bbB765047CFdD2b84b92b2Ca9F11D34b7Ed"
  "NVDA" = "0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3"
  "TSLA" = "0xf4ACdAEEB7022862A763C9B1B885e11191c889E3"
  "SPY"  = "0xA43b424Bc609495AED4BCD88d654934b510B0aD9"
}

foreach ($sym in @("AAPL", "NVDA", "TSLA", "SPY")) {
  $q = "Daily: $sym up today? ($dateTag)"
  & $cast send $twap "createUpDown(address,uint64,uint64,string)" $pools[$sym] $close $resolveT $q --rpc-url $rpc --private-key $pk | Out-Null
  "dibuat: $q"
}

$weekClose = $now + 4 * 86400 + 19800
$q = "Weekly duel: NVDA outperforms TSLA? ($dateTag, tie = TSLA)"
& $cast send $twap "createDuel(address,address,uint64,uint64,string)" $pools["NVDA"] $pools["TSLA"] $weekClose ($weekClose + 3600) $q --rpc-url $rpc --private-key $pk | Out-Null
"dibuat: $q"
"Selesai."
