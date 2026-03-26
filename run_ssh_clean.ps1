$sshArgs = @(
    "-o", "HostKeyAlgorithms=+ssh-rsa",
    "-o", "PubkeyAcceptedKeyTypes=+ssh-rsa",
    "-i", "f:\Antigravity\qixport.pem",
    "root@66.116.224.221",
    "sqlite3 /var/www/antigravity/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"; sqlite3 /var/www/antigravity/server/dist/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"; sqlite3 /var/www/antigravity/server/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"; sqlite3 /var/www/purple-port/server/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"; sqlite3 /var/www/purple-port/prisma/dev.db `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"; sqlite3 /var/www/qix-ads/server/prisma/dev.sqlite `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`"; sqlite3 /var/www/qix-ads-v2.6/server/prisma/dev.sqlite `"DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account';`""
)

Start-Process -NoNewWindow -Wait -FilePath "ssh.exe" -ArgumentList $sshArgs
