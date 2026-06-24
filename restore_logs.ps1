Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$sql = @"
ATTACH '/var/www/purple-port/server/prisma/dev_backup_20260618_020310.db' AS backup;

INSERT INTO main.AttendanceRecord (
    id, date, status, check_in, check_out, work_hours, shift_snapshot, 
    grace_time_applied, method, createdAt, updatedAt, user_id, criteria_mode, shift_id
)
SELECT 
    id, date, status, 
    check_in - 19800000 as check_in, 
    CASE WHEN check_out IS NOT NULL THEN check_out - 19800000 ELSE NULL END as check_out, 
    work_hours, shift_snapshot, grace_time_applied, method, createdAt, updatedAt, 
    user_id, criteria_mode, shift_id
FROM backup.AttendanceRecord 
WHERE method = 'BIOMETRIC';
"@

Invoke-SSHCommand -SessionId $s.SessionId -Command "cat << 'EOF' > /var/www/purple-port/server/restore_bio.sql`n$sql`nEOF" | Out-Null

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db < /var/www/purple-port/server/restore_bio.sql"
Write-Host "Output: " $r.Output
if ($r.Error) { Write-Host "Error: " $r.Error }

$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db `"SELECT COUNT(*) FROM AttendanceRecord WHERE method = 'BIOMETRIC';`""
Write-Host "Restored count: " $r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null
