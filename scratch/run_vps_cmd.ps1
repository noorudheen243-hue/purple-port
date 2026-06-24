param (
    [string]$Command = "whoami"
)

Import-Module Posh-SSH -ErrorAction Stop

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"

$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host "Connecting to VPS $VPS as $User..." -ForegroundColor Yellow
    $session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    if (-not $session) {
        throw "Failed to create SSH session."
    }
    
    Write-Host "Executing command: $Command" -ForegroundColor Yellow
    $res = Invoke-SSHCommand -SSHSession $session -Command $Command
    
    Write-Host "`n=== VPS Command Output ===" -ForegroundColor Green
    Write-Host $res.Output -ForegroundColor White
    
    if ($res.Error) {
        Write-Host "`n=== VPS Command Error ===" -ForegroundColor Red
        Write-Host $res.Error -ForegroundColor Red
    }
} catch {
    Write-Error "Error: $_"
} finally {
    if ($session) {
        Remove-SSHSession -SSHSession $session | Out-Null
        Write-Host "Disconnected." -ForegroundColor Yellow
    }
}
