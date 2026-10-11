param(
  [int]$DurationSeconds = 900,
  [int]$Port = 9223
)

$ErrorActionPreference = 'Stop'
$tabs = Invoke-RestMethod "http://127.0.0.1:$Port/json"
$tab = @($tabs) | Where-Object { $_.url -like 'http://127.0.0.1:4173/tora-online/*' } | Select-Object -First 1
if (-not $tab) { throw "Tora Online browser tab not found on DevTools port $Port." }

$socket = [Net.WebSockets.ClientWebSocket]::new()
$debugSocket = [string]$tab.webSocketDebuggerUrl
$null = $socket.ConnectAsync([Uri]$debugSocket, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
$script:commandId = 500
$script:errors = @()

function Invoke-Cdp([string]$method, $parameters) {
  $script:commandId++
  $wanted = $script:commandId
  $payload = @{ id = $wanted; method = $method; params = $parameters } | ConvertTo-Json -Compress -Depth 8
  $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
  $null = $socket.SendAsync([ArraySegment[byte]]::new($bytes), [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  while ($true) {
    $stream = [IO.MemoryStream]::new()
    do {
      $buffer = New-Object byte[] 65536
      $received = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      $stream.Write($buffer, 0, $received.Count)
    } until ($received.EndOfMessage)
    $message = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
    if ($message.method -eq 'Runtime.exceptionThrown') { $script:errors += $message.params.exceptionDetails.text }
    if ($message.method -eq 'Log.entryAdded' -and $message.params.entry.level -eq 'error') { $script:errors += $message.params.entry.text }
    if ($message.id -eq $wanted) { return $message }
  }
}

function Invoke-JavaScript([string]$expression) {
  return Invoke-Cdp 'Runtime.evaluate' @{ expression = $expression; returnByValue = $true }
}

$null = Invoke-Cdp 'Runtime.enable' @{}
$null = Invoke-Cdp 'Log.enable' @{}
$null = Invoke-Cdp 'Page.bringToFront' @{}
$samples = @()
$start = [DateTime]::UtcNow
$tick = 0
while (([DateTime]::UtcNow - $start).TotalSeconds -lt $DurationSeconds) {
  $tick++
  $key = if (($tick % 4) -lt 2) { 'KeyW' } else { 'KeyD' }
  $null = Invoke-JavaScript "dispatchEvent(new KeyboardEvent('keydown',{code:'$key'})); true"
  Start-Sleep -Milliseconds 650
  $null = Invoke-JavaScript "dispatchEvent(new KeyboardEvent('keyup',{code:'$key'})); true"
  if ($tick % 8 -eq 0) {
    $null = Invoke-JavaScript "dispatchEvent(new KeyboardEvent('keydown',{code:'Tab'})); dispatchEvent(new KeyboardEvent('keyup',{code:'Tab'})); dispatchEvent(new KeyboardEvent('keydown',{code:'Digit1'})); dispatchEvent(new KeyboardEvent('keyup',{code:'Digit1'})); true"
  }
  if ($tick % 30 -eq 0) {
    $result = Invoke-JavaScript "JSON.stringify({fatal:!document.getElementById('fatal-error').hidden,error:document.querySelector('#fatal-error span').textContent,fps:Number.parseInt(document.getElementById('debug-fps').textContent)||0,renderId:BABYLON.EngineStore.LastCreatedScene.getRenderId(),meshes:BABYLON.EngineStore.LastCreatedScene.getActiveMeshes().length})"
    $sample = $result.result.result.value | ConvertFrom-Json
    $samples += $sample
    Write-Output "sample=$($samples.Count) fps=$($sample.fps) render=$($sample.renderId) active=$($sample.meshes) fatal=$($sample.fatal)"
    if ($sample.fatal) { break }
  }
  Start-Sleep -Milliseconds 350
}

$null = Invoke-JavaScript "['KeyW','KeyA','KeyS','KeyD'].forEach(code=>dispatchEvent(new KeyboardEvent('keyup',{code}))); true"
$socket.Dispose()
$fps = @($samples | ForEach-Object { $_.fps } | Where-Object { $_ -gt 0 })
[pscustomobject]@{
  requestedSeconds = $DurationSeconds
  elapsedSeconds = [math]::Round(([DateTime]::UtcNow - $start).TotalSeconds, 1)
  samples = $samples.Count
  averageFps = if ($fps.Count) { [math]::Round(($fps | Measure-Object -Average).Average, 1) } else { 0 }
  minimumFps = if ($fps.Count) { ($fps | Measure-Object -Minimum).Minimum } else { 0 }
  maximumFps = if ($fps.Count) { ($fps | Measure-Object -Maximum).Maximum } else { 0 }
  browserErrors = $script:errors.Count
  fatal = [bool]($samples | Where-Object { $_.fatal })
} | ConvertTo-Json -Compress
