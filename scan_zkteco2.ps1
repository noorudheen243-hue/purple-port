$subnet = "10.38.225."
Write-Host "Scanning for ZKTeco devices on $subnet* :4370..."
$found = $false
foreach ($i in 1..254) {
    $ip = "$subnet$i"
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect($ip, 4370, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne(100, $false)
    if ($wait) {
        try {
            $tcp.EndConnect($async)
            Write-Host "[+] Found ZKTeco device at $ip" -ForegroundColor Green
            $found = $true
        } catch {}
    }
    $tcp.Close()
}
if (-not $found) {
    Write-Host "No devices found." -ForegroundColor Yellow
}
