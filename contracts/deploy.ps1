# Deploy HoodBet to RH Chain + trial market + proof of the TWAP path.
# Run standalone:  powershell -File "C:\Users\Galih Putra\hoodbet\contracts\deploy.ps1"
# Key is taken from hoodnft\.env (wallet 0x5891... â€” the only one with ETH gas).

$ErrorActionPreference = "Stop"
$forge = "$env:USERPROFILE\.foundry\bin\forge.exe"
$cast  = "$env:USERPROFILE\.foundry\bin\cast.exe"
$rpc   = "https://robinhood-rpc.publicnode.com"
$pk    = (Get-Content "$env:USERPROFILE\hoodnft\.env" | Select-String "^DEPLOYER_KEY=").ToString().Split("=")[1]

Set-Location "$env:USERPROFILE\hoodbet\contracts"
& $forge script script/Deploy.s.sol --rpc-url $rpc --private-key $pk --broadcast

$run = Get-Content "broadcast\Deploy.s.sol\4663\run-latest.json" -Raw | ConvertFrom-Json
$creates = @($run.transactions | Where-Object { $_.transactionType -eq "CREATE" })
$hood  = $creates[0].contractAddress
$twap  = $creates[1].contractAddress
$admin = $creates[2].contractAddress
""
"HoodBet       : $hood"
"TwapResolver  : $twap"
"AdminResolver : $admin"
""

# Trial market: AAPL up/down over the next hour. No USDG â€” the goal is to
# prove market creation + TWAP reads work against a real pool.
$aapl     = "0x783C9bbB765047CFdD2b84b92b2Ca9F11D34b7Ed"
$close    = [DateTimeOffset]::UtcNow.AddMinutes(10).ToUnixTimeSeconds()
$resolveT = [DateTimeOffset]::UtcNow.AddMinutes(71).ToUnixTimeSeconds()
& $cast send $twap "createUpDown(address,uint64,uint64,string)" $aapl $close $resolveT "TRIAL: AAPL up within the hour?" --rpc-url $rpc --private-key $pk | Out-Null

"Market #0 dibuat. Isi getMarket(0):"
& $cast call $hood "getMarket(uint256)(address,uint64,uint64,bool,bool,uint8,uint128,uint128,string)" 0 --rpc-url $rpc
""
"Bukti jalur TWAP - outcome(0) terbaca (0=turun, 1=naik):"
& $cast call $twap "outcome(uint256)(uint8)" 0 --rpc-url $rpc

# Update ONLY the address lines in the app .env â€” other lines (Privy id, etc) are kept.
$envPath = "$env:USERPROFILE\hoodbet\.env"
$deployBlock = [Convert]::ToUInt64($run.receipts[0].blockNumber.Substring(2), 16)
$keep = @()
if (Test-Path $envPath) {
  $keep = Get-Content $envPath | Where-Object { $_ -notmatch "^(NEXT_PUBLIC_PRESAGE_ADDRESS|NEXT_PUBLIC_TWAP_RESOLVER_ADDRESS|NEXT_PUBLIC_ADMIN_RESOLVER_ADDRESS|EVM_RPC_URL|PRESAGE_DEPLOY_BLOCK)=" }
}
$keep + @(
  "EVM_RPC_URL=$rpc",
  "NEXT_PUBLIC_PRESAGE_ADDRESS=$hood",
  "NEXT_PUBLIC_TWAP_RESOLVER_ADDRESS=$twap",
  "NEXT_PUBLIC_ADMIN_RESOLVER_ADDRESS=$admin",
  "PRESAGE_DEPLOY_BLOCK=$deployBlock"
) | Set-Content -Encoding utf8 $envPath
""
"Alamat tersimpan ke hoodbet\.env. Selesai."

