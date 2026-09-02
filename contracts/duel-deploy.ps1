# Deploy StockDuel to RH Chain and record its address in hoodbet\.env.
# Run: powershell -File duel-deploy.ps1

$ErrorActionPreference = "Stop"
$forge = "$env:USERPROFILE\.foundry\bin\forge.exe"
$rpc   = "https://robinhood-rpc.publicnode.com"
$pk    = (Get-Content "$env:USERPROFILE\hoodnft\.env" | Select-String "^DEPLOYER_KEY=").ToString().Split("=")[1]

Set-Location "$env:USERPROFILE\hoodbet\contracts"
& $forge script script/DuelDeploy.s.sol --rpc-url $rpc --private-key $pk --broadcast

$run = Get-Content "broadcast\DuelDeploy.s.sol\4663\run-latest.json" -Raw | ConvertFrom-Json
# Only record the address if the broadcast actually landed (receipts exist).
if (-not $run.receipts -or $run.receipts.Count -eq 0) {
  Write-Error "Deploy did not land (no receipts) — .env left untouched."
  exit 1
}
$addr = @($run.transactions | Where-Object { $_.transactionType -eq "CREATE" })[0].contractAddress
"StockDuel: $addr"

$envPath = "$env:USERPROFILE\hoodbet\.env"
$keep = Get-Content $envPath | Where-Object { $_ -notmatch "^NEXT_PUBLIC_STOCKDUEL_ADDRESS=" }
$keep + @("NEXT_PUBLIC_STOCKDUEL_ADDRESS=$addr") | Set-Content -Encoding utf8 $envPath
"Saved to .env. Done."
