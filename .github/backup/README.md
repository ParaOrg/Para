# Backup public key

`owner-public-key.asc` goes here: the owner's armored GPG **public** key, which
`.github/workflows/backup.yml` encrypts each weekly backup to. It is safe in a
public repo. The private key never is: keep it in a password manager and an
offline copy, never on GitHub.

The key is "Para backup (Para) <para.ph.info@gmail.com>", made on 2026-10-27,
fingerprint `220A A322 40F7 D682 AFAD  B7BD 0932 853C 1FF5 CC94`. It expires on
2029-10-28: make a new pair and replace this file before then, or the backup
stops. Backups made with it can still be opened with its private key after
that date.

How to make the pair, and the rest of the setup, are in the header of
`.github/workflows/backup.yml`.
