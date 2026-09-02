# Deploy StockDuel + ProfileRegistry and record addresses in hoodbet\.env.
$ErrorActionPreference = "Stop"
$forge = "$env:USERPROFILE\.foundry\bin\forge.exe"
$rpc = "https://robinhood-rpc.publicnode.com"
$pk = (Get-Content "$env:USERPROFILE\hoodnft\.env" | Select-String "^DEPLOYER_KEY=").ToString().Split("=")[1]

Set-Location "$env:USERPROFILE\hoodbet\contracts"
& $forge script script/PendingDeploy.s.sol --rpc-url $rpc --private-key $pk --broadcast

$run = Get-Content "broadcast\PendingDeploy.s.sol\4663\run-latest.json" -Raw | ConvertFrom-Json
if (-not $run.receipts -or $run.receipts.Count -eq 0) {
  Write-Error "Deploy did not land (no receipts). .env left untouched."
  exit 1
}
$creates = @($run.transactions | Where-Object { $_.transactionType -eq "CREATE" })
$duel = $creates[0].contractAddress
$reg = $creates[1].contractAddress
"StockDuel:       $duel"
"ProfileRegistry: $reg"

$envPath = "$env:USERPROFILE\hoodbet\.env"
$keep = Get-Content $envPath | Where-Object { $_ -notmatch "^(NEXT_PUBLIC_STOCKDUEL_ADDRESS|NEXT_PUBLIC_PROFILE_REGISTRY_ADDRESS)=" }
$keep + @("NEXT_PUBLIC_STOCKDUEL_ADDRESS=$duel", "NEXT_PUBLIC_PROFILE_REGISTRY_ADDRESS=$reg") | Set-Content -Encoding ascii $envPath
"Saved to .env. Done."
