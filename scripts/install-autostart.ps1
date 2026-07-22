#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$TaskName = "GerenciadorDemandas"
$Node = (Get-Command node).Source
$StartScript = Join-Path $Root "scripts\start.ps1"

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`"" `
  -WorkingDirectory $Root

$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Description "Inicia o Gerenciador de Demandas automaticamente no boot" | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host ""
Write-Host "Tarefa '$TaskName' instalada (At startup)."
Write-Host "Acesse http://IP-DA-VM:3030"
Write-Host "Gerenciar: Agendador de Tarefas > $TaskName"
Write-Host "Remover: Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
