#!/usr/bin/env bash
# Prints the keystore's store and key password: a SHA-256 of the owner's passphrase
# (PARAPO_KEY_PASSPHRASE) with a label, so the passphrase itself is never the keystore's password.
# The key-making workflow and the release build both call it, so they always agree. The passphrase
# comes from the environment, never an argument, so it is not in the process list.
set -euo pipefail

if [[ -z "${PARAPO_KEY_PASSPHRASE:-}" ]]; then
  echo "PARAPO_KEY_PASSPHRASE is not set" >&2
  exit 1
fi
printf 'parapo-keystore:%s' "$PARAPO_KEY_PASSPHRASE" | openssl dgst -sha256 -r | cut -d' ' -f1
