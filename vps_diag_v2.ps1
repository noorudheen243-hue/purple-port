$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    if ($s.Connected) {
        Write-Host "Success: Connected to VPS."
        $cmds = @(
            "pwd",
            "ls -la /var/www/purple-port/",
            "pm2 list",
            "tail -n 20 /var/www/purple-port/deployment.log"
        )
        foreach ($cmd in $cmds) {
            Write-Host "`n--- Executing: $cmd ---"
            $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
            if ($r.Output) { Write-Host $r.Output }
            if ($r.Error) { Write-Host "ERROR: $($r.Error)" }
        }
    } else {
        Write-Host "Failed: Not connected."
    }
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
