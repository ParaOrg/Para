# Backup public key

`owner-public-key.asc` goes here: the owner's armored GPG **public** key, which
`.github/workflows/backup.yml` encrypts each weekly backup to. It is safe in a
public repo. The private key never is: keep it in a password manager and an
offline copy, never on GitHub.

The file is not committed yet. Until it is, the backup workflow fails at its
first step with a message saying so, rather than backing up unencrypted.

How to make the pair, and the rest of the setup, are in the header of
`.github/workflows/backup.yml`.
